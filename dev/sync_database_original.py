import asyncio
from pyppeteer import launch
import os

structure = {}

Download_Directory = os.path.join(os.getcwd(), 'downloads')

pages = ["https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24If007/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24If007%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14"]

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
    
    DOWNLOAD_DIR = os.path.join(Download_Directory, 'downloads')
    
        # Change download folder
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    await page._client.send('Page.setDownloadBehavior', {
        'behavior': 'allow',
        'downloadPath': os.path.abspath(DOWNLOAD_DIR)
    })

    downloads_started = 0
    
    if Files != []:
    
        # Start all downloads simultaneously
        for el in Files:
            #to get File Name
            #inner_html = await page.evaluate('(e) => e.innerHTML', el)
            await el.executionContext.evaluate('element => element.scrollIntoViewIfNeeded()', el)
            #await page.waitFor(300)
            await el.click({'button': 'right'})
            await page.waitFor(300)
            download_button = await page.xpath("//*[text()='Download' or text()='Herunterladen']")
            
            if download_button:
                download_button = download_button[0]
                await download_button.click()
                downloads_started += 1
                await page.waitFor(100)

        #Check if all Files are Downloaded
        for _ in range(120):
            entries = os.listdir(DOWNLOAD_DIR)
            in_progress = [f for f in entries if f.endswith('.crdownload')]
            completed = [f for f in entries if not f.endswith('.crdownload')]
            if len(completed) >= downloads_started and not in_progress:
                break
            await asyncio.sleep(1)
        else:  # This block is executed if the loop completes without a break
            print("Timeout Error while Downloading. Rest of Files will be Downloaded next Time")
    
    print(f"All {downloads_started} downloads completed!")
    return

async def update_database(page):
    Folders, Files = await get_elements(page)
    await download_files(page, Files)
    
    if Folders != []:
        for i in range(len(Folders)):
            el = Folders[i]
            #to get Folder Name
            #inner_html = await page.evaluate('(e) => e.innerHTML', el)
            await el.executionContext.evaluate('element => element.scrollIntoViewIfNeeded()', el)
            await el.click()
            #No Timeout beacause Folder could be empty
            await page.waitFor(500)
            await update_database(page)
            
            #idfk where this goes
            refreshed_Folders, _ = await get_elements(page)
            if len(refreshed_Folders) >= len(Folders):
                Folders = refreshed_Folders
            else:
                print("Danger someone deleted a Folder mid Sync")
                break
        
        await page.waitFor(500)
        #Breadcrumb to go back
        await page.goBack()
    else:
        await page.waitFor(500)
        #Breadcrumb to go back
        await page.goBack()
    return


async def main():
    page = await open_browser()
    await goto_page(page, pages[0])
    await update_database(page)
    
    # Close browser
    
    

if __name__ == "__main__":
    asyncio.run(main())