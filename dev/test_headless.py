import asyncio
from pyppeteer import launch
import os

async def test_headless_login():
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
        headless=True,
        userDataDir=user_data_dir,
        executablePath=chrome_exe,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    )
    
    page = await browser.newPage()
    
    # Navigate to SharePoint document library
    await page.goto('https://eduzh.sharepoint.com/teams/2120AAD-365-M-COU-EBI2120-G24Gm006/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fteams%2F2120AAD%2D365%2DM%2DCOU%2DEBI2120%2DG24Gm006%2FFreigegebene%20Dokumente%2FGeneral&viewid=ebe2067a%2D413b%2D4e41%2Dabd1%2Dedef0c0cbc14')
    
    # Wait for page to load
    await page.waitFor(3000)
    
    # Check if logged in (you can modify this check based on page content)
    title = await page.title()
    print(f"Page title: {title}")
    
    # Scroll lowest heroField element into view 5 times
    for i in range(5):
        await page.evaluate('var elements = document.querySelectorAll("[data-id=\'heroField\']"); if(elements.length > 0) elements[elements.length - 1].scrollIntoView();')
        await page.waitFor(1000)

    # Take screenshot to verify
    await page.screenshot({'path': 'headless_test.png'})
    print("Screenshot saved as headless_test.png")
    
    # Get page HTML after click
    html_content = await page.content()
    with open('page_source.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("HTML saved as page_source.html")
    
    await browser.close()

if __name__ == "__main__":
    asyncio.run(test_headless_login())