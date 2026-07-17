import {
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Modal,
	Notice,
	Plugin,
    Platform,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	BankaiSettingTab,
    BankaiSettings,
} from './settings';
import { 
    spawn, 
    exec,
} from 'child_process';
import * as path from 'path';

// Remember to rename these classes and interfaces!

export default class Bankai extends Plugin {
	settings!: BankaiSettings; 

    // Timer
    private timerId: number | null = null;
    private readonly intervalMs = this.settings.DownloadInterval;

    public startTimer(): void {
        // Start the automated loop
        this.timerId = window.setInterval(() => this.intervalMs);
    }

    private resetTimer(): void {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
        }
        this.startTimer();
    }

    public stopTimer(): void {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    
	async onload() {
		await this.loadSettings();
        this.startTimer

		this.addRibbonIcon('table', 'Open Database Searcher', () => {
			this.activateTableView();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'SyncDB',
			name: 'Sync Database',
			callback: () => {
				this.bankaiSync();
			},
		});

        this.addSettingTab(new BankaiSettingTab(this.app, this));

        this.addCommand({
            id: 'open-input-modal',
            name: 'Bankai Open Input Modal',
            callback: () => {
                new BankaiModal(this.app).open();
            }
        });

	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<BankaiSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

    async bankaiInit() {
        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginId = this.manifest.id;
        const pluginPath = path.join(vaultBasePath, '.obsidian', 'plugins', pluginId);
        const scriptBin = (() => {
            if (Platform.isWin) {
                const scriptName = 'bankai-init.exe';
                return path.join(pluginPath, scriptName);
            } else if (Platform.isLinux) {
                const scriptName = 'bankai-init';
                return path.join(pluginPath, scriptName);
            } else {
                throw new Error(`Unsupported Operating System: ${navigator.platform}`);
            }
        })();

        try {
            //TODO
            const subprocess = spawn(scriptBin, ["-P", "", "-p", pluginPath]);
            this.updateButtonIsSyncing(true);

            // 1. Spawn Errors (Process failed to start)
            subprocess.on('error', (err: Error) => {
                console.error("[Bankai] Spawn Error(initialize):", err);
                new Notice(`Critical Error: ${err.message}`);
            });

            // 2. Runtime Errors (Stderr output)
            subprocess.stderr.on('data', (data: Error) => {
                const msg = data.toString();
                console.error("[Bankai] Stderr(initialize):", msg);
                // Only notify on stderr if it's critical, otherwise it spams
            });

            // 3. Standard Output (Logs from Python)
            subprocess.stdout.on('data', (data: string) => {
                console.log(`[Bankai] Stdout(initialize): ${data}`);
            });

            // 4. Exit Handling (Process finished)
            subprocess.on('close', (codeNumber: number) => {
                console.log(`[Bankai] Process exited with code ${codeNumber} on Process initialize`);
                
                if (codeNumber === 0) {
                    this.updateButtonIsSyncing(false);
                    new Notice(`Finished Initializing`);
                } else {
                    new Notice(`initialization failed. Exit Code: ${codeNumber}. Check Console.`);
                }
        });

        } catch (e) {
            console.error("[Bankai] Execution Exception:", e);
            new Notice(`Failed to initialize: ${e instanceof Error ? e.message : String(e)}`);
        }
        
    }

    async updateButtonIsSyncing(running: boolean) {
        new Notice('Bankai Reset Under Construction');
    }

    async bankaiSync() {
        new Notice('Syncing...');
        this.stopTimer

        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginId = this.manifest.id;
        const pluginPath = path.join(vaultBasePath, '.obsidian', 'plugins', pluginId);
        const targetDir = path.join(vaultBasePath, this.settings.DownloadDirectory);
        const scriptBin = (() => {
            if (Platform.isWin) {
                const scriptName = 'bankai-sync.exe';
                return path.join(pluginPath, scriptName);
            } else if (Platform.isLinux) {
                const scriptName = 'bankai-sync';
                return path.join(pluginPath, scriptName);
            } else {
                throw new Error(`Unsupported Operating System: ${navigator.platform}`);
            }
        })();

        try {
            const subprocess = spawn(scriptBin, ["-p", pluginPath, "-r", targetDir]);
            this.updateButtonIsSyncing(true);

            // 1. Spawn Errors (Process failed to start)
            subprocess.on('error', (err: Error) => {
                console.error("[Bankai] Spawn Error(Sync):", err);
                new Notice(`Critical Error: ${err.message}`);
                this.updateButtonIsSyncing(false);
            });

            // 2. Runtime Errors (Stderr output)
            subprocess.stderr.on('data', (data: Error) => {
                const msg = data.toString();
                console.error("[Bankai] Stderr(Sync):", msg);
                // Only notify on stderr if it's critical, otherwise it spams
            });

            // 3. Standard Output (Logs from Python)
            subprocess.stdout.on('data', (data: string) => {
                console.log(`[Bankai] Stdout(Sync): ${data}`);
            });

            // 4. Exit Handling (Process finished)
            subprocess.on('close', (codeNumber: number) => {
                console.log(`[Bankai] Process exited with code ${codeNumber} on Process Sync`);
                
                if (codeNumber === 0) {
                    this.updateButtonIsSyncing(false);
                    new Notice(`Finished Syncing`);
                } else {
                    new Notice(`Process failed. Exit Code: ${codeNumber}. Check Console.`);
                }
                
                this.startTimer
                this.updateButtonIsSyncing(false);
        });

    } catch (e) {
        console.error("[Bankai] Execution Exception:", e);
        new Notice(`Failed to launch: ${e instanceof Error ? e.message : String(e)}`);
        this.updateButtonIsSyncing(false);
    }
    }

    activateTableView() {
        new Notice('Bankai Table View Under Construction');
    }

}

class BankaiModal extends Modal {
	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}