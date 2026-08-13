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
    WorkspaceLeaf,
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
import { TableView, VIEW_TYPE } from './view';
import { time } from 'console';

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

		this.addRibbonIcon('table', 'Open TableView', () => {
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
        
        this.registerView(
            VIEW_TYPE,
            (leaf) => new TableView(leaf, this)
        );
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
        if (running) {
            TableView.syncButton.textContent = 'Syncing...';
			TableView.syncButton.disabled = true;
			TableView.syncSpinner.style.display = 'inline-block';
        }
        else {
            TableView.syncButton.textContent = 'Sync';
            TableView.syncButton.disabled = false;
            TableView.syncSpinner.style.display = 'none';
        }
    }

    async processErrorHandling(
        scriptBin: string,
        args: string[],
        callbacks: {
            onSuccess?: () => void;
            onError?: (err: Error | unknown) => void;
            onStderr?: (msg: string) => void;
            onStdout?: (msg: string) => void;
            onClose?: (code: number) => void;
            onFail?: (code: number) => void;
            onConFail?: (msg: unknown) => void;
        } = {}
    ): Promise<void> {
        let rawData = '';
        try {
            const subprocess = spawn(scriptBin, args);

            subprocess.on('error', (err: Error) => {
                console.error(`[Bankai] Spawn Error(${scriptBin}):`, err);
                new Notice(`Critical Error: ${err.message}`);
                if (callbacks.onError) callbacks.onError(err);
            });

            subprocess.stderr?.on('data', (data: Buffer) => {
                const msg = data.toString();
                console.error(`[Bankai] Stderr(${scriptBin}):`, msg);
                if (callbacks.onStderr) callbacks.onStderr(msg);
            });

            subprocess.stdout?.on('data', (data: Buffer) => {
                rawData += data.toString();
                subprocess.stdout.on('end', () => {
                    const msg = rawData;
                    console.log(`[Bankai] Stdout(${scriptBin}): ${msg}`);
                    if (callbacks.onStdout) callbacks.onStdout(msg);
                });
            });

            subprocess.on('close', (codeNumber: number) => {
                console.log(`[Bankai] Process exited with code ${codeNumber} on Process ${scriptBin}`);
                
                if (codeNumber === 0) {
                    if (callbacks.onSuccess) callbacks.onSuccess();
                } else {
                    new Notice(`Process failed. Exit Code: ${codeNumber}. Check Console. On Process ${scriptBin}`);
                    if (callbacks.onFail) callbacks.onFail(codeNumber);
                }

                if (callbacks.onClose) callbacks.onClose(codeNumber);
                
            });

        } catch (e) {
            console.error(`[Bankai] Execution Exception(${scriptBin}):`, e);
            new Notice(`Failed to launch: ${e instanceof Error ? e.message : String(e)}`);
            if (callbacks.onConFail) callbacks.onConFail(e);
        }
    }

    async bankaiSync() {
        TableView.syncTime = new Date();
        this.saveData(this.settings.syncTime);
        new Notice('Syncing...');
        this.stopTimer()

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

        this.updateButtonIsSyncing(true);

        this.processErrorHandling(
        scriptBin,
        ["-p", pluginPath, "-r", targetDir],
        {
            onSuccess: () => {
                new Notice('Finished Syncing');
            },
            onError: (err) => {
                this.updateButtonIsSyncing(false);
                this.settings.syncTime = new Date();
                this.saveSettings();
            },
            onClose: (code) => {
                this.startTimer();
                this.updateButtonIsSyncing(false);
                this.settings.syncTime = new Date();
                this.saveSettings();
            },
            onFail: (code) => {
                new Notice(`Process failed. Exit Code: ${code}. Check Console.`);
            },
            onConFail: (msg) => {
                this.updateButtonIsSyncing(false);
                this.settings.syncTime = new Date();
                this.saveSettings();
            }
        }
        )
    }

    async activateTableView() {
        const { workspace } = this.app;
        
        let leaf: WorkspaceLeaf | null | undefined = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            // true/false dictates if the leaf is split. false appends to existing right sidebar.
            leaf = workspace.getRightLeaf(false);
        }

        if (!leaf) {
            return;
        }

        if (leaves.length === 0) {
            await leaf.setViewState({ type: VIEW_TYPE, active: true });
        }

        workspace.revealLeaf(leaf);
    }

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

            if (this.settings.SetupMode == '0') {
                this.processErrorHandling(scriptBin, ["-p", pluginPath, "-m", "0", "--spass", sPassword, "--smail", sEmail, "-P", adminPassword], {})
            }
            else if (this.settings.SetupMode == '1') {
                this.processErrorHandling(scriptBin, ["-p", pluginPath, "-m", "1"], {})
            }
            else if (this.settings.SetupMode == '2') {
                this.processErrorHandling(scriptBin, ["-p", pluginPath, "-m", "2", "-P", adminPassword], {})
            }
            else if (this.settings.SetupMode == '3') {
                this.processErrorHandling(scriptBin, ["-p", pluginPath, "-m", "3", "--spass", sPassword, "--smail", sEmail], {})
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