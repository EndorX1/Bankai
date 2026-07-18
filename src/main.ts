import {
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Modal,
	Notice,
	Plugin,
    Platform,
    Setting,
    App,
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

export class InputConfidentialData extends Modal {
    private adminPassword = "";
    private sEmail = "";
    private sPassword = "";
    private mode: string;
    private onSubmit: (adminPassword: string, sEmail: string, sPassword: string) => void;

    constructor(app: App, mode: string, onSubmit: (adminPassword: string, sEmail: string, sPassword: string) => void) {
        super(app);
        this.mode = mode;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h1", { text: "User Data Input" });
        
        // Render Admin Password field for specific modes (e.g., '0' Initialize all, '2' Update Dependencies)
        if (Platform.isLinux && (this.mode === '0' || this.mode === '2')) {
            new Setting(contentEl)
                .setName("Admin Password")
                .addText((text) =>
                    text.onChange((value) => {
                        this.adminPassword = value;
                    })
                );
        }
        
        // Render Microsoft Credentials for specific modes (e.g., '0' Initialize all, '3' Update Credentials)
        if (this.mode === '0' || this.mode === '3') {
            new Setting(contentEl)
                .setName("Microsoft Email")
                .addText((text) =>
                    text.onChange((value) => {
                        this.sEmail = value;
                    })
                );

            new Setting(contentEl)
                .setName("Microsoft Password")
                .addText((text) =>
                    text.onChange((value) => {
                        this.sPassword = value;
                    })
                );
        }

        new Setting(contentEl)
            .addButton((btn) =>
                btn 
                    .setButtonText("Submit")
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.adminPassword, this.sEmail, this.sPassword);
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class Bankai extends Plugin {
	settings!: BankaiSettings; 

    // Timer
    private timerId: number | null = null;

    public startTimer(): void {
        // Start the automated loop
        const intervalMs = this.settings.DownloadInterval * 60 * 1000; // Convert minutes to milliseconds
        this.timerId = window.setInterval(() => this.bankaiSync, intervalMs);
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
        this.startTimer();

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

    async updateButtonIsSyncing(running: boolean) {
        new Notice('Bankai Button Under Construction');
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
            subprocess.stderr?.on('data', (data: Buffer) => {
                const msg = data.toString();
                console.error("[Bankai] Stderr(Sync):", msg);
                // Only notify on stderr if it's critical, otherwise it spams
            });

            // 3. Standard Output (Logs from Python)
            subprocess.stdout?.on('data', (data: Buffer) => {
                console.log(`[Bankai] Stdout(Sync): ${data.toString()}`);
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

    async activateTableView() {
        new Notice('Bankai Table View Under Construction');
    }

    //TODO Fuck as cursed and does absolutely nothing
    async handleInputWindow() {
        const confBuild = (adminPassword = "", sEmail = "", sPassword = "") => {
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
                let subprocess: ReturnType<typeof spawn> | undefined;

                if (this.settings.SetupMode == '0') {
                    subprocess = spawn(scriptBin, ["-p", pluginPath, "-m", "0", "--spass", sPassword, "--smail", sEmail, "-P", adminPassword]);
                }
                else if (this.settings.SetupMode == '1') {
                    subprocess = spawn(scriptBin, ["-p", pluginPath, "-m", "1"]);
                }
                else if (this.settings.SetupMode == '2') {
                    subprocess = spawn(scriptBin, ["-p", pluginPath, "-m", "2", "-P", adminPassword]);
                }
                else if (this.settings.SetupMode == '3') {
                    subprocess = spawn(scriptBin, ["-p", pluginPath, "-m", "3", "--spass", sPassword, "--smail", sEmail]);
                }

                if (!subprocess) {
                    throw new Error(`Unsupported setup mode: ${this.settings.SetupMode}`);
                }

                // 1. Spawn Errors (Process failed to start)
                subprocess.on('error', (err: Error) => {
                    console.error("[Bankai] Spawn Error(Init):", err);
                    new Notice(`Critical Error: ${err.message}`);
                });

                // 2. Runtime Errors (Stderr output)
                subprocess.stderr?.on('data', (data: Buffer) => {
                    const msg = data.toString();
                    console.error("[Bankai] Stderr(Init):", msg);
                    // Only notify on stderr if it's critical, otherwise it spams
                });

                // 3. Standard Output (Logs from Python)
                subprocess.stdout?.on('data', (data: Buffer) => {
                    console.log(`[Bankai] Stdout(Init): ${data.toString()}`);
                });

                // 4. Exit Handling (Process finished)
                subprocess.on('close', (codeNumber: number) => {
                    console.log(`[Bankai] Process exited with code ${codeNumber} on Process Init`);
                    
                    if (codeNumber === 0) {
                        this.updateButtonIsSyncing(false);
                        new Notice(`Finished Init`);
                    } else {
                        new Notice(`Process failed(Init). Exit Code: ${codeNumber}. Check Console.`);
                    }
                });

            } catch (e) {
                console.error("[Bankai] Execution Exception(Init):", e);
                new Notice(`Failed to launch: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        if (this.settings.SetupMode != '1') {
            new InputConfidentialData(this.app, this.settings.SetupMode, (adminPassword: string, sEmail: string, sPassword: string) => {
                confBuild(adminPassword, sEmail, sPassword);
            }).open();
        }
        else {
            confBuild();
        }
    }
}