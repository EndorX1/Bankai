import asyncio
from pyppeteer import launch
import os
import sys
import zipfile
import requests
import platform
import json
from datetime import datetime
from spire.doc import Document, FileFormat
import stat
import subprocess


DatabasePath = sys.argv[1]
PluginPath = sys.argv[2]
selectedCode = sys.argv[3]
SubjectPrioritization = sys.argv[4]

#DatabasePath = r"/home/elia/Documents/Obsidian/ObsidianPlugin/Database/"
#PluginPath = r"/home/elia/Documents/Obsidian/ObsidianPlugin/.obsidian/plugins/Bankai/"
#selectedCode = "sync"
#SubjectPrioritization = "Italienisch"

user_data_dir = os.path.join(PluginPath,'dependencies', 'browser_data')
os.makedirs(user_data_dir, exist_ok=True)
    
# Check and download Chromium if needed (Windows only)
chromium_dir = os.path.join(PluginPath, 'dependencies', 'chromium')
if sys.platform == "win32":
    chrome_path = os.path.join(chromium_dir, 'chrome-win', 'chrome.exe')
elif sys.platform == "linux":
    chrome_path = os.path.join(chromium_dir, 'chrome-linux', 'chrome')
else:
    raise ValueError("The provided operating system is not supported")


async def open_sharepoint():  
    print(chrome_path)
    
    if not os.path.exists(chrome_path):
        print("Downloading Chromium...")
        os.makedirs(chromium_dir, exist_ok=True)
        
        # 1. URL Selection
        if sys.platform == "win32":
            url = "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%2F1579260%2Fchrome-win.zip?alt=media"
        else:
            url = "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F1579321%2Fchrome-linux.zip?alt=media"
            
        # 2. Download
        zip_path = os.path.join(chromium_dir, 'chromium.zip')
        response = requests.get(url, stream=True)
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        # 3. Extraction
        print("Extracting...")
        if sys.platform == "linux":
            # --- THE FIX: Use system unzip instead of Python zipfile ---
            # This preserves permissions (+x) and Symlinks
            try:
                subprocess.run(["unzip", "-o", zip_path, "-d", chromium_dir], check=True)
            except FileNotFoundError:
                print("Error: 'unzip' command not found. Please install it with: sudo dnf install unzip")
                raise
        else:
            # Windows doesn't care about permissions, zipfile is fine
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(chromium_dir)

        os.remove(zip_path)
        
        # 4. Safety Check (Just in case)
        if sys.platform == "linux":
            # Explicitly force the main binary to be executable, just to be safe
            subprocess.run(["chmod", "+x", chrome_path], check=False)
    
    # Launch browser
    browser = await launch(
        headless=False,
        userDataDir=user_data_dir,
        dumpio=True,
        executablePath=chrome_path,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    )
    
    page = await browser.newPage()
    
    # Navigate to SharePoint site
    await page.goto('https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24If007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24If007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14')
    
    # Keep browser open for manual login
    #print("Browser opened. Please log in manually.")
    #print("You got 5 minutes")
    await page.waitForSelector('[data-id="heroField"]', timeout=300000)
    
    await browser.close()
    




async def open_browser():
    # Launch in headless mode with saved data
    browser = await launch(
        headless=False,
        userDataDir=user_data_dir,
        executablePath=chrome_path,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    )
    
    page = await browser.newPage()
    await page.setViewport({'width': 1920, 'height': 1080})
    
    #print("Browser opened.")
    
    return browser, page

async def goto_page(page, url):
    
    await page.goto(url)
    try:
        await page.waitForSelector('[data-id="heroField"]', timeout=30000)
    except:
        #print("Error: Timeout while waiting for page to load")
        return
    
    
async def get_elements(page):
    for i in range(5):
        await page.evaluate('var elements = document.querySelectorAll("[data-id=\'heroField\']"); if(elements.length > 0) elements[elements.length - 1].scrollIntoView();')
        await page.waitFor(300)
    
    elements = await page.querySelectorAll('[data-id="heroField"]')
    
    #print(f"Found {len(elements)} elements")
    
    return await assign_elements(page, elements)
    
async def assign_elements(page, elements):
    Folders = []
    Files = []
    
    for el in elements:
        attr = await page.evaluate('(el) => el.getAttribute("data-selection-invoke")', el)
        if attr == "true":
            Folders.append(el)
        else:
            Files.append(el)
       
    #print(f"Found {len(Folders)} folders and {len(Files)} files")
    
    return Folders, Files
    

async def download_files(page, Files):
    # Create folder structure in downloads
    folder_path = os.path.join(Download_Directory, *current_path) if current_path else Download_Directory
    os.makedirs(folder_path, exist_ok=True)
    
    await page._client.send('Page.setDownloadBehavior', {
        'behavior': 'allow',
        'downloadPath': os.path.abspath(folder_path)
    })

    downloads_started = 0
    downloaded_files = []
    
    # Check existing files in database
    current_dict = structure
    for folder in current_path:
        if folder not in current_dict:
            current_dict[folder] = {}
        current_dict = current_dict[folder]
    existing_file_data = current_dict.get('__FileData__', {})
    
    if Files:
        # Start downloads
        for el in Files:
            file_name = await page.evaluate('(e) => e.textContent.trim()', el)
            
            # Skip if already downloaded
            if file_name in existing_file_data:
                #print(f"Skipping {file_name} - already downloaded")
                continue
            
            await el.executionContext.evaluate('element => element.scrollIntoViewIfNeeded()', el)
            await el.click({'button': 'right'})
            await page.waitFor(300)
            download_button = await page.xpath("//*[text()='Download' or text()='Herunterladen']")
            
            if download_button:
                download_button = download_button[0]
                await download_button.click()
                downloads_started += 1
                downloaded_files.append(file_name)
                existing_file_data[file_name] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                await page.waitFor(100)

        # Monitor downloads and convert as they complete
        if downloads_started > 0:
            converted_files = set()
            for _ in range(60):
                entries = os.listdir(folder_path)
                in_progress = [f for f in entries if f.endswith('.crdownload')]
                completed = [f for f in entries if not f.endswith('.crdownload')]
                
                # Convert completed Word docs immediately
                for file_name in downloaded_files:
                    if file_name in completed and file_name not in converted_files:
                        if file_name.endswith('.docx') or file_name.endswith('.doc'):
                            doc_name = file_name.rsplit('.', 1)[0] + '.pdf'
                            file_path = os.path.join(folder_path, file_name)
                            doc_path = os.path.join(folder_path, doc_name)
                            
                            try:
                                doc = Document()
                                doc.LoadFromFile(file_path)
                                doc.SaveToFile(doc_path, FileFormat.PDF)
                                doc.Close()
                                existing_file_data[doc_name] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                #print(f"Converted {file_name} to {doc_name}")
                                converted_files.add(file_name)
                            except Exception as e:
                                #print(f"Failed to convert {file_name}: {e}")
                                pass
                
                # Check if all downloads complete
                if len(completed) >= downloads_started and not in_progress:
                    break
                await asyncio.sleep(1)
            else:
                #print("Timeout Error while Downloading. Rest of Files will be Downloaded next Time")
                pass
    
    # Update files in structure
    current_dict['__FileData__'] = existing_file_data
    
    #print(f"All {downloads_started} downloads completed!")
    return

async def update_database(page):   
    Folders, Files = await get_elements(page)
    await download_files(page, Files)
    
    # Iterate through folders with state recovery
    for i in range(len(Folders)):
        await page.waitForSelector('[data-actions="[{"key":"header-field-click","data":1},{"key":"header-field-keyDown","data":1}]"]', timeout=30000)
        sortByNameButton = await page.querySelector('[data-actions="[{"key":"header-field-click","data":1},{"key":"header-field-keyDown","data":1}]"]')
        await sortByNameButton.click()
        sort_button = await page.xpath("//span[text()='Ascending' or text()='Aufsteigend']")
        if sort_button:
            await sort_button[0].click()
            await asyncio.sleep(1)
        
        # Re-verify folder list after returning from recursion
        refreshed_Folders, _ = await get_elements(page)
        if i >= len(refreshed_Folders):
            print("Danger someone deleted a Folder mid Sync")
            break
        
        for il in refreshed_Folders:
            print(await page.evaluate('(z) => z.textContent.trim()', il))
            
        el = refreshed_Folders[i]
        folder_name = await page.evaluate('(e) => e.textContent.trim()', el)
        
        # Cycle Detection: Prevent re-entry into existing path segments
        if folder_name in current_path:
            continue
            
        # Update structure and local path
        current_dict = structure
        for path_segment in current_path:
            current_dict = current_dict[path_segment]
        if folder_name not in current_dict:
            current_dict[folder_name] = {}
        
        current_path.append(folder_name)
        
        # Navigate forward
        await el.executionContext.evaluate('element => element.scrollIntoView()', el)
        await el.click()
        await asyncio.sleep(2) # Required for SharePoint DOM state update
        
        # Recursive call
        await update_database(page)
        
        # Navigate backward and synchronize state
        current_path.pop()
        await page.goBack()
        await page.waitForSelector('[data-id="heroField"]', timeout=30000)
        await asyncio.sleep(1) 
        
    return


async def sync_subject(page, subject_name, url, structure, data_path):
    """Encapsulates the sync logic for a single subject."""
    if subject_name not in structure:
        structure[subject_name] = {}
    
    current_path.clear()
    current_path.append(subject_name)
    
    await goto_page(page, url)
    await update_database(page)
    
    current_path.clear()
    
    structure["SyncTime"] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(structure, f, indent=2, ensure_ascii=False)

async def main():
    browser, page = await open_browser()
    
    # Determine which subjects to process
    if SubjectPrioritization:
        # Filter for specific subject only
        targets = [(SubjectPrioritization, pages[Subjects.index(SubjectPrioritization)])]
    else:
        # Process all subjects
        targets = list(zip(Subjects, pages))

    for name, url in targets:
        await sync_subject(page, name, url, structure, dataPath)
            
    await browser.close()

    

if __name__ == "__main__":
    if selectedCode == "sync":
        
        dataPath = os.path.join(PluginPath, 'dependencies', 'database.json')
        subjectPath = os.path.join(PluginPath, 'dependencies', 'subjects.json')
        
        # Load existing structure
        try:
            with open(dataPath, 'r', encoding='utf-8') as f:
                structure = json.load(f)
        except FileNotFoundError:
            structure = {}

        current_path = []

        Download_Directory = DatabasePath
        
        with open(subjectPath, 'r', encoding='utf-8') as f:
                subData = json.load(f)

        pages = []
        for page in subData:
            pages.append(subData[page])

        Subjects = []
        for subject in subData:
            Subjects.append(subject)
        
        
        asyncio.run(main())
    elif selectedCode == "setup":
        asyncio.run(open_sharepoint())
