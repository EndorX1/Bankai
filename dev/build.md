# Build Commands

PyInstaller compile commands for bankai binaries
Run on each target platform to compile the binaries

TypeScript build/dev commands for the Obsidian plugin:

- `npm run dev`        # watch build
- `npm run build`      # production bundle
- `npm run typecheck`  # TS type check only

## Run on bankaiDev level

### Linux

```bash
./venv/bin/pyinstaller --onefile --name bankai-sync --distpath bankai/dev/build/dist/linux --workpath bankai/dev/build/build/sync --specpath bankai/dev/spec/api bankai/src/Sync.py
./venv/bin/pyinstaller --onefile --name bankai-init --distpath bankai/dev/build/dist/linux --workpath bankai/dev/build/build/setup --specpath bankai/dev/spec/api bankai/src/rcloneCookie.py
./venv/bin/pyinstaller --onefile --name bankai-api --distpath bankai/dev/build/dist/linux --workpath bankai/dev/build/build/api --specpath bankai/dev/spec/api bankai/src/API.py
```

### macOS (run on macOS)

```bash
./venv/bin/pyinstaller --onefile --name bankai-sync --distpath bankai/dev/build/dist/mac --workpath bankai/dev/build/build/sync --specpath bankai/dev/spec/api bankai/src/Sync.py
./venv/bin/pyinstaller --onefile --name bankai-init --distpath bankai/dev/build/dist/mac --workpath bankai/dev/build/build/setup --specpath bankai/dev/spec/api bankai/src/rcloneCookie.py
./venv/bin/pyinstaller --onefile --name bankai-api --distpath bankai/dev/build/dist/mac --workpath bankai/dev/build/build/api --specpath bankai/dev/spec/api bankai/src/API.py
```

### Windows (run on Windows with cmd)

```bash
venv\\Scripts\\pyinstaller.exe --onefile --name bankai-sync --distpath bankai\\dev\\build\\dist\\win --workpath bankai\\dev\\build\\build\\sync --specpath bankai\\dev\\spec\\api bankai\\src\\Sync.py
venv\\Scripts\\pyinstaller.exe --onefile --name bankai-init --distpath bankai\\dev\\build\\dist\\win --workpath bankai\\dev\\build\\build\\setup --specpath bankai\\dev\\spec\\api bankai\\src\\rcloneCookie.py
venv\\Scripts\\pyinstaller.exe --onefile --name bankai-api --distpath bankai\\dev\\build\\dist\\win --workpath bankai\\dev\\build\\build\\api --specpath bankai\\dev\\spec\\api bankai\\src\\API.py
```

## Obsidian plugin deploy (Linux)

From the `bankai` package root, these Linux-only commands will compile the plugin and copy the generated files into `TestVault/.obsidian/plugins/bankai`:

```bash
npm run build:linux
npm run copy:linux
npm run test
```
