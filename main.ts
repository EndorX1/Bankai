import { App, ItemView, Plugin, WorkspaceLeaf, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const VIEW_TYPE_TABLE = 'table-view' as const;

interface PluginSettings {
	DownloadInterval: number;
	DownloadDirectory: string;
	PluginEnabled: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	DownloadInterval: 10,
	DownloadDirectory: '',
	PluginEnabled: true,
};

const COL_NAME = 'Name of the file';
const COL_SUBJECT = 'Subject';
const COL_FOLDER = 'Folder Path to the file';
const COL_DATE = 'Date Added';

type Row = Record<typeof COL_NAME | typeof COL_SUBJECT | typeof COL_FOLDER | typeof COL_DATE, string>;

export default class Bankai extends Plugin {
	settings!: PluginSettings;
	private intervalId: number | null = null;

	async onload() {
		await this.loadSettings();

		this.addCommand({ id: 'SyncDB', name: 'Sync Database', callback: () => this.SyncDatabase('sync') });

		this.registerView(VIEW_TYPE_TABLE, (leaf) => new TableView(leaf, this));

		this.addRibbonIcon('table', 'Open Database Searcher', () => {
			this.activateView();
		});

		this.addSettingTab(new BankaiSettingTab(this.app, this));

		this.startInterval(this.settings.DownloadInterval);
	}

	onunload() {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	private async saveSettings() {
		await this.saveData(this.settings);
	}

	private async isExeRunning(exeName: string): Promise<boolean> {
		return new Promise((resolve) => {
			exec('tasklist', (err, stdout) => {
				if (err) {
					resolve(false);
					return;
				}
				const running = stdout.toLowerCase().includes(exeName.toLowerCase());
				resolve(running);
			});
		});
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TABLE);

		leaf = leaves.length > 0 ? leaves[0] : workspace.getRightLeaf(false);
		await leaf?.setViewState({ type: VIEW_TYPE_TABLE, active: true });
		workspace.revealLeaf(leaf!);
	}

	startInterval(minutes: number) {
		if (!this.settings.PluginEnabled) {
			if (this.intervalId !== null) {
				window.clearInterval(this.intervalId);
				this.intervalId = null;
			}
			return;
		}

		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
		}

		const ms = Math.max(1, Math.floor(minutes)) * 60 * 1000;
		this.intervalId = window.setInterval(() => this.SyncDatabase('sync'), ms);
		this.registerInterval(this.intervalId);
	}

	SyncDatabase(code: string) {
		const vaultBasePath = (this.app.vault.adapter as any).basePath as string; // Desktop only
		const pluginId = this.manifest.id;
		const targetDir = path.join(vaultBasePath, this.settings.DownloadDirectory);
		const pluginPath = path.join(vaultBasePath, '.obsidian', 'Plugins', pluginId);
		const scriptPath = path.join(vaultBasePath, '.obsidian', 'Plugins', pluginId, 'dependencies', 'dist', 'sync', 'sync.exe');
		const args = [targetDir, pluginPath, code];

		this.isExeRunning('sync.exe').then((running) => {
			if (running) {
				new Notice('Already running');
				return;
			}

			const subprocess = spawn(scriptPath, args);

			subprocess.on('error', (err) => {
				new Notice(`Failed to start sync: ${String(err)}`);
			});

			subprocess.stdout.on('data', (data) => {
				new Notice("Finished Syncing");
			});

			subprocess.stderr.on('data', (data) => {
				new Notice(String(data));
			});
		});
	}

	resetData() {
		const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
		const pluginId = this.manifest.id;
		const purgePath = path.join(vaultBasePath, '.obsidian', 'Plugins', pluginId, 'dependencies', 'browser_data');
		fs.rmSync(purgePath, { recursive: true, force: true });
		new Notice('Data reset complete');
	}
}

class TableView extends ItemView {
	private plugin: Bankai;
	private allData: Row[] = [];
	private filteredData: Row[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: Bankai) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_TABLE;
	}

	getDisplayText() {
		return 'Table View';
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (!container) return;
		container.empty();
		container.createEl('h2', { text: 'Data Table' });

		try {
			this.allData = await this.loadJsonData();
			this.filteredData = [...this.allData];
			this.createControls(container);
			this.createTable(container, this.filteredData);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			container.createEl('p', { text: 'Error loading data: ' + msg });
		}
	}

	private async loadJsonData(): Promise<Row[]> {
		const adapter = this.app.vault.adapter;
		const pluginId = this.plugin.manifest.id;
		const dataPath = `.obsidian/Plugins/${pluginId}/dependencies/database.json`;
		const raw = await adapter.read(dataPath);
		const json = JSON.parse(raw);
		return this.extractFiles(json);
	}

	private extractFiles(data: any): Row[] {
		const files: Row[] = [];

		const traverse = (obj: any, subject: string, curPath: string) => {
			for (const key in obj) {
				if (key === '__FileData__' && typeof obj[key] === 'object' && obj[key]) {
					for (const fileName in obj[key]) {
						files.push({
							[COL_NAME]: fileName,
							[COL_SUBJECT]: subject,
							[COL_FOLDER]: curPath,
							[COL_DATE]: String(obj[key][fileName]),
						});
					}
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
					const newPath = curPath ? `${curPath}/${key}` : key;
					traverse(obj[key], subject, newPath);
				}
			}
		};

		for (const subject in data) {
			traverse(data[subject], subject, subject);
		}

		return files;
	}

	private createControls(container: Element) {
		const controlsDiv = container.createEl('div');
		controlsDiv.style.marginBottom = '20px';

		const searchInput = controlsDiv.createEl('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Search files...';
		searchInput.style.width = '100%';
		searchInput.style.padding = '8px';
		searchInput.style.marginBottom = '10px';
		searchInput.addEventListener('input', () => this.filterData(searchInput.value));

		const buttonsDiv = controlsDiv.createEl('div');
		buttonsDiv.style.marginBottom = '10px';
		const nameBtn = buttonsDiv.createEl('button', { text: 'Sort by Name' });
		nameBtn.style.marginRight = '10px';
		nameBtn.addEventListener('click', () => this.sortData(COL_NAME));

		const subjectBtn = buttonsDiv.createEl('button', { text: 'Sort by Subject' });
		subjectBtn.addEventListener('click', () => this.sortData(COL_SUBJECT));

		const timeBtn = buttonsDiv.createEl('button', { text: 'Sort by Time' });
		timeBtn.style.marginLeft = '10px';
		timeBtn.addEventListener('click', () => this.sortDataReverse(COL_DATE));

		const subjectButtonsDiv = controlsDiv.createEl('div');
		subjectButtonsDiv.style.marginBottom = '10px';
		const subjects = [...new Set(this.allData.map((item) => item[COL_SUBJECT]))];

		const allBtn = subjectButtonsDiv.createEl('button', { text: 'All' });
		allBtn.style.marginRight = '10px';
		allBtn.addEventListener('click', () => this.filterBySubject(''));

		subjects.forEach((subject) => {
			const btn = subjectButtonsDiv.createEl('button', { text: subject });
			btn.style.marginRight = '10px';
			btn.addEventListener('click', () => this.filterBySubject(subject));
		});

		const timeButtonsDiv = controlsDiv.createEl('div');

		const todayBtn = timeButtonsDiv.createEl('button', { text: 'Today' });
		todayBtn.style.marginRight = '10px';
		todayBtn.addEventListener('click', () => this.filterByDays(0));

		const daysLabel = timeButtonsDiv.createEl('span', { text: 'Last Days:' });
		daysLabel.style.marginRight = '5px';

		const daysInput = timeButtonsDiv.createEl('input');
		daysInput.type = 'number';
		daysInput.placeholder = '7';
		daysInput.style.width = '50px';
		daysInput.style.marginRight = '5px';
		daysInput.style.marginLeft = '10px';
		daysInput.addEventListener('input', () => {
			const days = parseInt(daysInput.value, 10);
			if (!Number.isNaN(days)) this.filterByDays(days);
		});
	}

	private filterData(searchTerm: string) {
		const term = searchTerm.trim().toLowerCase();
		if (!term) {
			this.filteredData = [...this.allData];
		} else {
			this.filteredData = this.allData.filter((item) =>
				item[COL_NAME].toLowerCase().includes(term) ||
				item[COL_SUBJECT].toLowerCase().includes(term) ||
				item[COL_FOLDER].toLowerCase().includes(term) ||
				item[COL_DATE].toLowerCase().includes(term),
			);
		}
		this.updateTable();
	}

	private sortData(field: keyof Row) {
		this.filteredData.sort((a, b) => a[field].localeCompare(b[field]));
		this.updateTable();
	}

	private sortDataReverse(field: keyof Row) {
		this.filteredData.sort((a, b) => b[field].localeCompare(a[field]));
		this.updateTable();
	}

	private filterBySubject(subject: string) {
		if (!subject) {
			this.filteredData = [...this.allData];
		} else {
			this.filteredData = this.allData.filter((item) => item[COL_SUBJECT] === subject);
		}
		this.updateTable();
	}

	private filterByDays(days: number) {
		const now = new Date();
		const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
		const cutoffStr = cutoff.toISOString().split('T')[0];
		this.filteredData = this.allData.filter((item) => item[COL_DATE].split(' ')[0] >= cutoffStr);
		this.updateTable();
	}

	private updateTable() {
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (!container) return;
		const existing = container.querySelector('table');
		if (existing) existing.remove();
		this.createTable(container, this.filteredData);
	}

	private createTable(container: Element, data: Row[]) {
		if (!data || data.length === 0) {
			return;
		}

		const keys = Object.keys(data[0]) as (keyof Row)[];

		const table = container.createEl('table');
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		keys.forEach((key) => {
			const th = headerRow.createEl('th');
			th.textContent = key as string;
			th.style.border = '1px solid var(--background-modifier-border)';
			th.style.padding = '8px';
			th.style.backgroundColor = 'var(--background-secondary)';
		});

		const tbody = table.createEl('tbody');
		data.forEach((row) => {
			const tr = tbody.createEl('tr');
			keys.forEach((key) => {
				const td = tr.createEl('td');
				td.textContent = row[key];
				td.style.border = '1px solid var(--background-modifier-border)';
				td.style.padding = '8px';

				if (key === COL_NAME) {
					td.style.cursor = 'pointer';
					td.style.color = 'var(--text-accent)';
					td.addEventListener('click', () => {
						const fullPath = `${row[COL_FOLDER]}/${row[key]}`;
						navigator.clipboard.writeText(fullPath);
						new Notice('Copied path to clipboard');
					});
				}
			});
		});

		container.appendChild(table);
	}

	async onClose() {}
}

class BankaiSettingTab extends PluginSettingTab {
	private plugin: Bankai;

	constructor(app: App, plugin: Bankai) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable')
			.setDesc('Enables Plugin')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.PluginEnabled)
					.onChange(async (value) => {
						this.plugin.settings.PluginEnabled = value;
						await this.plugin.saveData(this.plugin.settings);
						this.plugin.startInterval(this.plugin.settings.DownloadInterval);
					}),
			);

		new Setting(containerEl)
			.setName('Download Interval (min)')
			.setDesc('Time interval to update file database')
			.addText((text) =>
				text
					.setPlaceholder('Minutes')
					.setValue(String(this.plugin.settings.DownloadInterval))
					.onChange(async (value) => {
						const minutes = parseInt(value, 10);
						this.plugin.settings.DownloadInterval = Number.isNaN(minutes) ? DEFAULT_SETTINGS.DownloadInterval : minutes;
						await this.plugin.saveData(this.plugin.settings);
						this.plugin.startInterval(this.plugin.settings.DownloadInterval);
					}),
			);

		new Setting(containerEl)
			.setName('Directory')
			.setDesc('File saving location')
			.addText((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.DownloadDirectory)
					.onChange(async (value) => {
						this.plugin.settings.DownloadDirectory = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName('Run Setup')
			.setDesc('Initialize the plugin and download dependencies')
			.addButton((button) => {
				button
					.setButtonText('Run Setup')
					.onClick(() => this.plugin.SyncDatabase('setup'));
			});

		new Setting(containerEl)
			.setName('Reset Data')
			.setDesc('Clear browser data and cookies. If you experience problems, try this.')
			.addButton((button) =>
				button
					.setButtonText('Reset Data')
					.onClick(() => new ResetConfirmModal(this.app, () => this.plugin.resetData()).open()),
			);
	}
}

class ResetConfirmModal extends Modal {
	private callback: () => void;

	constructor(app: App, callback: () => void) {
		super(app);
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Are you sure?' });
		contentEl.createEl('p', { text: 'You will have to run setup again.' });

		const buttonDiv = contentEl.createEl('div');
		buttonDiv.style.display = 'flex';
		buttonDiv.style.gap = '10px';
		buttonDiv.style.justifyContent = 'center';
		buttonDiv.style.marginTop = '20px';

		const yesBtn = buttonDiv.createEl('button', { text: 'Yes' });
		yesBtn.addEventListener('click', () => {
			this.callback();
			this.close();
		});

		const noBtn = buttonDiv.createEl('button', { text: 'No' });
		noBtn.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


