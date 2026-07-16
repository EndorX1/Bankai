# Build Commands

PyInstaller compile commands for Bankai binaries
Run on each target platform to compile the binaries

TypeScript build/dev commands for the Obsidian plugin:

- `npm run dev`        # watch build
- `npm run build`      # production bundle
- `npm run typecheck`  # TS type check only

## Run on BankaiDev level

### Linux

```bash
./venv/bin/pyinstaller --onefile --name bankai-sync --distpath Bankai/dev/build/dist/linux --workpath Bankai/dev/build/sync --specpath Bankai/dev/spec/api ../Sync.py
./venv/bin/pyinstaller --onefile --name bankai-setup --distpath Bankai/dev/build/dist/linux --workpath Bankai/dev/build/setup --specpath Bankai/dev/spec/api ../Setup.py
./venv/bin/pyinstaller --onefile --name bankai-api --distpath Bankai/dev/build/dist/linux --workpath Bankai/dev/build/api --specpath Bankai/dev/spec/api ../API.py
```

### macOS (run on macOS)

```bash
./venv/bin/pyinstaller --onefile --name bankai-sync --distpath Bankai/dev/build/dist/mac --workpath Bankai/dev/build/sync --specpath Bankai/dev/spec/api ../Sync.py
./venv/bin/pyinstaller --onefile --name bankai-setup --distpath Bankai/dev/build/dist/mac --workpath Bankai/dev/build/setup --specpath Bankai/dev/spec/api ../Setup.py
./venv/bin/pyinstaller --onefile --name bankai-api --distpath Bankai/dev/build/dist/mac --workpath Bankai/dev/build/api --specpath Bankai/dev/spec/api ../API.py
```

### Windows (run on Windows with cmd)

```bash
venv\Scripts\pyinstaller.exe --onefile --name bankai-sync --distpath Bankai\dev\build\dist\win --workpath Bankai\dev\build\sync --specpath Bankai\dev\spec\api ..\Sync.py
venv\Scripts\pyinstaller.exe --onefile --name bankai-setup --distpath Bankai\dev\build\dist\win --workpath Bankai\dev\build\setup --specpath Bankai\dev\spec\api ..\Setup.py
venv\Scripts\pyinstaller.exe --onefile --name bankai-api --distpath Bankai\dev\build\dist\win --workpath Bankai\dev\build\api --specpath Bankai\dev\spec\api ..\API.py
```
