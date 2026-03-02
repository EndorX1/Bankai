# Exe
python -m PyInstaller --noconsole --hidden-import=spire.doc --hidden-import=pyppeteer --collect-all=spire --distpath "./dependencies/win" ./dependencies/sync.py

chmod +x dependencies/linux/sync

./dependencies/linux/sync/sync "/home/elia/Documents/Obsidian/ObsidianPlugin/" "/home/elia/Documents/Obsidian/ObsidianPlugin/.obsidian/plugins/Bankai/" "setup" "Italienisch"

# Python
python -m venv dev/venv