import asyncio
from pyppeteer import launch
import os

async def open_sharepoint():
    # Create browser data directory
    user_data_dir = os.path.join(os.getcwd(),'dependencies', 'browser_data')
    os.makedirs(user_data_dir, exist_ok=True)
    
    chrome_exe = os.path.join(os.getcwd(),'dependencies', 'chromium', 'chrome-win', 'chrome.exe')
    
    # Launch browser
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
    
    # Navigate to SharePoint site
    await page.goto('https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24Gm006/SitePages/ClassHome.aspx')
    
    # Keep browser open for manual login
    print("Browser opened. Please log in manually.")
    print("Press Enter after logging in to close the browser...")
    input()
    
    await browser.close()

if __name__ == "__main__":
    asyncio.run(open_sharepoint())