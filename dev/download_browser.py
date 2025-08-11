import os
import requests
import zipfile
from pathlib import Path

def download_chromium():
    browser_dir = os.path.join(os.getcwd(), 'chromium')
    os.makedirs(browser_dir, exist_ok=True)
    
    # Use a working Chromium snapshot
    chromium_url = "https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/1108766/chrome-win.zip"
    zip_path = os.path.join(browser_dir, 'chrome-win.zip')
    
    print("Downloading Chromium...")
    
    try:
        response = requests.get(chromium_url, stream=True)
        response.raise_for_status()
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print("Extracting Chromium...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(browser_dir)
        
        # Remove zip file
        os.remove(zip_path)
        
        chrome_exe = os.path.join(browser_dir, 'chrome-win', 'chrome.exe')
        if os.path.exists(chrome_exe):
            print(f"Chromium installed at: {chrome_exe}")
            return chrome_exe
        else:
            print("Chrome executable not found after extraction")
            return None
            
    except Exception as e:
        print(f"Download failed: {e}")
        return None

if __name__ == "__main__":
    download_chromium()