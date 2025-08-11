import asyncio
from pyppeteer import launch
import os
import json
from datetime import datetime

# Load existing structure
try:
    with open('database.json', 'r', encoding='utf-8') as f:
        structure = json.load(f)
except FileNotFoundError:
    structure = {}

current_path = []

Download_Directory = os.path.join(os.getcwd(), 'downloads')

pages = ["https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24If007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24If007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14", "https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24E007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24E007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14", "https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24B006/Freigegebene%20Dokumente/Forms/AllItems.aspx"]
Subjects = ["Informatik", "English", "Biologie"]

async def open_browser():
    # Use same browser data directory
    user_data_dir = os.path.join(os.getcwd(), 'browser_data')
    
    # Try to find system Chrome first, then local chromium
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
        os.path.join(os.getcwd(), 'chromium', 'chrome-win', 'chrome.exe')
    ]
    
    chrome_exe = None
    for path in chrome_paths:
        if os.path.exists(path):
            chrome_exe = path
            break
    
    # Launch in headless mode with saved data
    browser = await launch(
        headless=False,
        userDataDir=user_data_dir,
        executablePath=chrome_exe,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    )
    
    page = await browser.newPage()
    await page.setViewport({'width': 1920, 'height': 1080})
    
    print("Browser opened.")
    
    return page

async def goto_page(page, url):
    
    await page.goto(url)
    try:
        await page.waitForSelector('[data-id="heroField"]', timeout=30000)
    except:
        print("Error: Timeout while waiting for page to load")
        return
    
    
async def get_elements(page):
    for i in range(5):
        await page.evaluate('var elements = document.querySelectorAll("[data-id=\'heroField\']"); if(elements.length > 0) elements[elements.length - 1].scrollIntoView();')
        await page.waitFor(1000)
    
    elements = await page.querySelectorAll('[data-id="heroField"]')
    
    print(f"Found {len(elements)} elements")
    
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
       
    print(f"Found {len(Folders)} folders and {len(Files)} files")
    
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
    file_names = []
    
    # Check existing files in database
    current_dict = structure
    for folder in current_path:
        if folder not in current_dict:
            current_dict[folder] = {}
        current_dict = current_dict[folder]
    existing_file_data = current_dict.get('__FileData__', {})
    
    if Files:
        # Get file names and check if already downloaded
        for el in Files:
            file_name = await page.evaluate('(e) => e.textContent.trim()', el)
            file_names.append(file_name)
            
            # Add sync date for new files
            if file_name not in existing_file_data:
                existing_file_data[file_name] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Skip if already downloaded
            if file_name in existing_file_data:
                print(f"Skipping {file_name} - already downloaded")
                continue
            
            await el.executionContext.evaluate('element => element.scrollIntoViewIfNeeded()', el)
            await el.click({'button': 'right'})
            await page.waitFor(300)
            download_button = await page.xpath("//*[text()='Download' or text()='Herunterladen']")
            
            if download_button:
                download_button = download_button[0]
                await download_button.click()
                downloads_started += 1
                await page.waitFor(100)

        # Wait for downloads to complete
        if downloads_started > 0:
            for _ in range(60):
                entries = os.listdir(folder_path)
                in_progress = [f for f in entries if f.endswith('.crdownload')]
                completed = [f for f in entries if not f.endswith('.crdownload')]
                if len(completed) >= downloads_started and not in_progress:
                    break
                await asyncio.sleep(1)
            else:
                print("Timeout Error while Downloading. Rest of Files will be Downloaded next Time")
    
    # Update files in structure
    current_dict['__FileData__'] = existing_file_data
    
    print(f"All {downloads_started} downloads completed!")
    return

async def update_database(page):
    Folders, Files = await get_elements(page)
    await download_files(page, Files)
    
    if Folders:
        for i in range(len(Folders)):
            el = Folders[i]
            # Get folder name
            folder_name = await page.evaluate('(e) => e.textContent.trim()', el)
            
            # Add folder to structure if it doesn't exist
            current_dict = structure
            for folder in current_path:
                current_dict = current_dict[folder]
            if folder_name not in current_dict:
                current_dict[folder_name] = {}
            
            # Navigate into folder
            current_path.append(folder_name)
            await el.executionContext.evaluate('element => element.scrollIntoViewIfNeeded()', el)
            await el.click()
            await page.waitFor(500)
            await update_database(page)
            
            # Go back
            current_path.pop()
            refreshed_Folders, _ = await get_elements(page)
            if len(refreshed_Folders) >= len(Folders):
                Folders = refreshed_Folders
            else:
                print("Danger someone deleted a Folder mid Sync")
                break
        
        await page.waitFor(500)
        await page.goBack()
    else:
        await page.waitFor(500)
        await page.goBack()
    return


async def main():
    page = await open_browser()
    for i in range(len(pages)):
        subject_name = Subjects[i]
        
        # Initialize subject in structure
        if subject_name not in structure:
            structure[subject_name] = {}
        
        # Set current path to subject
        current_path.clear()
        current_path.append(subject_name)
        
        await goto_page(page, pages[i])
        await update_database(page)
        
        # Clear path after processing subject
        current_path.clear()
    
    # Save structure to JSON
    with open('database.json', 'w', encoding='utf-8') as f:
        json.dump(structure, f, indent=2, ensure_ascii=False)
    
    print("Database structure saved to database.json")
    await page.browser.close()
    
    

if __name__ == "__main__":
    asyncio.run(main())