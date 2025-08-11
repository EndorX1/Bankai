import json
import time
from playwright.sync_api import sync_playwright
import os
import sys
import subprocess
import pygetwindow as gw
import win32gui
from pathlib import Path

empty = False

def fix_playwright_path():
    if getattr(sys, 'frozen', False):
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(Path(sys._MEIPASS) / "ms-playwright")

fix_playwright_path()

DatabasePath = sys.argv[1]
ObsidianFolder = sys.argv[2]

#DatabasePath = "Database"
#ObsidianFolder = "C:/Users/eliac/Documents/Obsidian/Plugins"

print("Updating...", flush=True)

Bio = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24B006/Freigegebene%20Dokumente/Forms/AllItems.aspx"""
Algebra = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24Alg006/Freigegebene%20Dokumente/Forms/AllItems.aspx"""
Italienisch = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24I007/Kursmaterialien/Forms/AllItems.aspx"""
Deutsch = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24D007/Kursmaterialien/Forms/AllItems.aspx"""
English = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24E007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24E007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14"""
Geometrie = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24Gm006/Freigegebene%20Dokumente/Forms/AllItems.aspx?FolderCTID=0x012000812C715DB5CD8249B9390F2508CA6F82&id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24Gm006%2FFreigegebene%20Dokumente%2FGeneral"""
#Informatik = """https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24If007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24If007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14"""

URLs = [Bio, Algebra, Italienisch, Deutsch, English, Geometrie]

folder_structure = {}

with open(f'{ObsidianFolder}/.obsidian/plugins/Bankai/database.json', 'r', encoding='utf-8') as f:
    old_structure = json.load(f)
    
Button_name = 'span[role="button"][tabindex="-1"][aria-disabled="false"][data-id="heroField"][data-is-focusable="true"]'
    
def convert_to_pdf(fp):
    try:
        subprocess.run(
            [f"{ObsidianFolder}/.obsidian/plugins/Bankai/dist/convert_word.exe", fp],
            check=True
        )
        print(f"Converted: {fp}", flush=True)
    except subprocess.CalledProcessError:
        print(f"Could not convert {fp}, Please Convert it yourself", flush=True)

def dict_to_paths(d, path=None):
    if path is None:
        path = []

    paths = []

    for key, value in d.items():
        if key == "__files__":
            for f in value:
                paths.append("/".join(path + [f]))
        elif isinstance(value, dict):
            paths.extend(dict_to_paths(value, path + [key]))
    
    return paths

def get_var_name(variable):
     for name, value in globals().items():
        if value is variable:
            return name

def scan_folder(page, depth=0, path={}, path_list=[]):
        #MAX_DEPTH = 2
        
        #if depth >= MAX_DEPTH:
        #    return {}
        
        structure = {}
        
        try:
            page.wait_for_selector(Button_name, timeout=2000)
        except:
            return structure
        
        while True:
            page.wait_for_timeout(1000)
            all_elements = page.query_selector_all(Button_name)
            folders = [el for el in all_elements if el.get_attribute("data-selection-invoke") == "true"]
            files = [el for el in all_elements if el.get_attribute("data-selection-invoke") != "true"]
            for file_el in files:
                file_el.scroll_into_view_if_needed()
                name = file_el.inner_text().strip()
                structure.setdefault("__files__", []).append(name)

                if name not in path.get("__files__", []):
                    with page.expect_download() as download_info:
                        file_el.click(button="right")
                        page.wait_for_timeout(300)  # Small pause for the menu to appear
                        download_button = page.query_selector('text="Download"') or page.query_selector('text="Herunterladen"')

                        if download_button:
                            download_button.click()
                        else:
                            raise Exception("Download button not found in any language")
                    download = download_info.value
                    folder_path = "/".join(path_list)
                    os.makedirs(f"{ObsidianFolder}/{DatabasePath}/{folder_path}", exist_ok=True)
                    fp = f'{ObsidianFolder}/{DatabasePath}/{folder_path}/{download.suggested_filename}'
                    download.save_as(fp)
                    if fp.endswith(".docx") or fp.endswith(".doc"):
                        convert_to_pdf(fp)


            
            if not folders:
                break
            
            for i in range(len(folders)):
                page.wait_for_timeout(500)
                refreshed_elements = page.query_selector_all(Button_name)
                refreshed_folders = [el for el in refreshed_elements if el.get_attribute("data-selection-invoke") == "true"]

                if i >= len(refreshed_folders):
                    continue

                folder_el = refreshed_folders[i]
                name = folder_el.inner_text().strip()

                folder_el.click()
                page.wait_for_timeout(500)
                if name not in path:
                    path[name] = {}
                subfolder = scan_folder(page, depth + 1, path.get(name, {}), path_list + [name])
                structure[name] = subfolder

                back_btn = page.query_selector('[data-automationid="BreadcrumbChevron"]')
                if back_btn:
                    back_btn.click()
                    page.reload()

                else:
                    page.go_back()
                    page.reload()

            break
        
        return structure


with sync_playwright() as p:
    user_dir = f"{ObsidianFolder}/.obsidian/plugins/Bankai/t-o"  # this folder will store the full browser context
    
    if not os.path.exists(user_dir) or not os.listdir(user_dir):
        os.makedirs(user_dir, exist_ok=True)
        empty = True
        
    # Create or reuse the profile
    context = p.chromium.launch_persistent_context(user_dir, args=["--disable-features=DownloadShelf,DownloadsUI"], headless=False)
    time.sleep(2)
    page = context.new_page()
    #check if t-o is empty and loging in
    if empty:
        page.goto(Bio)
        page.wait_for_selector(Button_name, timeout=120000)

    for w in gw.getWindowsWithTitle('Chromium'):
        if w.visible:
            hwnd = w._hWnd
            win32gui.ShowWindow(hwnd, 0)  # 0 = SW_HIDE
    
    for site in URLs:
        page.goto(site)
        name = get_var_name(site)
        folder_structure[name] = scan_folder(page, path=old_structure.get(name, {}), path_list=[name])


    # Save to file
    with open(f"{ObsidianFolder}/.obsidian/plugins/Bankai/database.json", "w", encoding="utf-8") as f:
        json.dump(folder_structure, f, indent=2)
    
    print("Database Update Finished", flush=True)
    
    context.close()
