import { App, ItemView, Plugin, WorkspaceLeaf, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import { spawn } from 'child_process';
import { exec } from 'child_process';

import * as path from 'path';
import * as fs from 'fs';

const VIEW_TYPE_TABLE = 'table-view';

interface PluginSettings {
	DownloadInterval: number;
	DownloadDirectory: string;
	PluginEnabled: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	DownloadInterval: 10,
	DownloadDirectory: '',
	PluginEnabled: true
};


export default class TablePlugin extends Plugin {
	settings: PluginSettings;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async isExeRunning(exeName: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		exec('tasklist', (err, stdout, stderr) => {
			if (err) {
				reject(err);
				return;
			}
			const running = stdout.toLowerCase().includes(exeName.toLowerCase());
			resolve(running);
		});
	});
}
	
	async onload() {
		this.addCommand({
			id:"SyncDB",
			name:"Sync Database",
			callback: () => this.SyncDatabase("sync")
		});

		this.registerView(
			VIEW_TYPE_TABLE,
			(leaf) => new TableView(leaf, this)
		);

		this.addRibbonIcon('table', 'Open Table View', () => {
			this.activateView();
		});

		this.addSettingTab(new TablePluginSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TABLE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_TABLE, active: true });
		}

		workspace.revealLeaf(leaf!);
	}

	intervalId: number | null = null;

	startInterval(minutes: number) {
		if (this.settings.PluginEnabled) {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
		}

		this.intervalId = window.setInterval(() => {
			this.SyncDatabase("sync");
		}, minutes * 60 * 1000);

		this.registerInterval(this.intervalId);
	} else {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}}

	SyncDatabase(code: string) {		

		const pluginFolder = (this.app.vault.adapter as any).basePath
		const directory = path.join(pluginFolder, this.settings.DownloadDirectory)
		//const scriptPath = path.join(pluginFolder, '.obsidian','plugins','Bankai', 'browser.py')
		const scriptPath = path.join(pluginFolder, '.obsidian','plugins','Bankai', 'dependencies', 'sync.exe')
		//const args = [scriptPath, directory, pluginFolder]
		const args = [directory, code]

		this.isExeRunning('Sync.exe').then((running) => {
			if (running) {
				new Notice('Already running');
				return;
			}

		const subprocess = spawn(scriptPath, args);
			subprocess.stdout.on('data', (data) => {
			new Notice(${data.toString()});
		});

		subprocess.stderr.on('data', (data) => {
			new Notice(${data.toString()});
		});
	});
}
	resetData() {
			const pluginFolder = (this.app.vault.adapter as any).basePath
			const P = path.join(pluginFolder, '.obsidian','plugins','Bankai', 't-o');
			fs.rmSync(P , { recursive: true, force: true });
		}
	
}



class TableView extends ItemView {
	plugin: TablePlugin;
	allData: any[] = [];
	filteredData: any[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: TablePlugin) {
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
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl('h2', { text: 'Data Table' });

		try {
			this.allData = await this.loadJsonData();
			this.filteredData = [...this.allData];
			this.createControls(container);
			this.createTable(container, this.filteredData);
		} catch (error) {
			container.createEl('p', { text: 'Error loading data: ' + error.message });
		}
	}

	async loadJsonData() {
		const adapter = this.app.vault.adapter;
		const pluginDir = this.plugin.manifest.dir || '';
		const dataPath = ${pluginDir}/database.json;
		const data = await adapter.read(dataPath);
		const jsonData = JSON.parse(data);
		return this.extractFiles(jsonData);
	}

	extractFiles(data: any): any[] {
		const files: any[] = [];
		
		const traverse = (obj: any, subject: string, path: string) => {
			for (const key in obj) {
				if (key === '__FileData__' && typeof obj[key] === 'object') {
					for (const fileName in obj[key]) {
						files.push({
							'Name of the file': fileName,
							'Subject': subject,
							'Folder Path to the file': path,
							'Date Added': obj[key][fileName]
						});
					}
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
					const newPath = path ? ${path}/${key} : key;
					traverse(obj[key], subject, newPath);
				}
			}
		};
		
		for (const subject in data) {
			traverse(data[subject], subject, subject);
		}
		
		return files;
	}

	createControls(container: Element) {
		const controlsDiv = container.createEl('div');
		controlsDiv.style.marginBottom = '20px';

		// Search bar
		const searchInput = controlsDiv.createEl('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Search files...';
		searchInput.style.width = '100%';
		searchInput.style.padding = '8px';
		searchInput.style.marginBottom = '10px';
		searchInput.addEventListener('input', () => this.filterData(searchInput.value));

		// Sort buttons
		const buttonsDiv = controlsDiv.createEl('div');
		buttonsDiv.style.marginBottom = '10px';
		const nameBtn = buttonsDiv.createEl('button', { text: 'Sort by Name' });
		nameBtn.style.marginRight = '10px';
		nameBtn.addEventListener('click', () => this.sortData('Name of the file'));

		const subjectBtn = buttonsDiv.createEl('button', { text: 'Sort by Subject' });
		subjectBtn.addEventListener('click', () => this.sortData('Subject'));

		const timeBtn = buttonsDiv.createEl('button', { text: 'Sort by Time' });
		timeBtn.style.marginLeft = '10px';
		timeBtn.addEventListener('click', () => this.sortDataReverse('Date Added'));

		// Subject filter buttons
		const subjectButtonsDiv = controlsDiv.createEl('div');
		subjectButtonsDiv.style.marginBottom = '10px';
		const subjects = [...new Set(this.allData.map(item => item['Subject']))];
		
		const allBtn = subjectButtonsDiv.createEl('button', { text: 'All' });
		allBtn.style.marginRight = '10px';
		allBtn.addEventListener('click', () => this.filterBySubject(''));
		
		subjects.forEach(subject => {
			const btn = subjectButtonsDiv.createEl('button', { text: subject });
			btn.style.marginRight = '10px';
			btn.addEventListener('click', () => this.filterBySubject(subject));
		});

		// Time filter buttons
		const timeButtonsDiv = controlsDiv.createEl('div');
		
		const todayBtn = timeButtonsDiv.createEl('button', { text: 'Today' });
		todayBtn.style.marginRight = '10px';
		todayBtn.addEventListener('click', () => this.filterByDays(0));

		const daysInput = timeButtonsDiv.createEl('input');
		daysInput.type = 'number';
		daysInput.placeholder = '7';
		daysInput.style.width = '50px';
		daysInput.style.marginRight = '5px';
		daysInput.style.marginLeft = '10px';
		daysInput.addEventListener('input', () => {
			const days = parseInt(daysInput.value);
			if (!isNaN(days)) {
				this.filterByDays(days);
			}
		});

		const daysLabel = timeButtonsDiv.createEl('span', { text: 'Last Days:' });
		daysLabel.style.marginRight = '5px';
		timeButtonsDiv.insertBefore(daysLabel, daysInput);
	}

	filterData(searchTerm: string) {
		if (!searchTerm) {
			this.filteredData = [...this.allData];
		} else {
			this.filteredData = this.allData.filter(item => 
				item['Name of the file'].toLowerCase().includes(searchTerm.toLowerCase()) ||
				item['Subject'].toLowerCase().includes(searchTerm.toLowerCase()) ||
				item['Folder Path to the file'].toLowerCase().includes(searchTerm.toLowerCase()) ||
				item['Date Added'].includes(searchTerm)
			);
		}
		this.updateTable();
	}

	sortData(field: string) {
		this.filteredData.sort((a, b) => a[field].localeCompare(b[field]));
		this.updateTable();
	}

	sortDataReverse(field: string) {
		this.filteredData.sort((a, b) => b[field].localeCompare(a[field]));
		this.updateTable();
	}

	filterBySubject(subject: string) {
		if (!subject) {
			this.filteredData = [...this.allData];
		} else {
			this.filteredData = this.allData.filter(item => item['Subject'] === subject);
		}
		this.updateTable();
	}

	filterByDays(days: number) {
		const today = new Date();
		const cutoffDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
		const cutoffDateString = cutoffDate.toISOString().split('T')[0];

		this.filteredData = this.allData.filter(item => {
			const itemDate = item['Date Added'].split(' ')[0]; // Extract date part
			return itemDate >= cutoffDateString;
		});
		this.updateTable();
	}

	updateTable() {
		const container = this.containerEl.children[1];
		const existingTable = container.querySelector('table');
		if (existingTable) {
			existingTable.remove();
		}
		this.createTable(container, this.filteredData);
	}

	createTable(container: Element, data: any[]) {
		const table = container.createEl('table');
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';

		// Create header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		const keys = Object.keys(data[0]);
		
		keys.forEach(key => {
			const th = headerRow.createEl('th');
			th.textContent = key;
			th.style.border = '1px solid var(--background-modifier-border)';
			th.style.padding = '8px';
			th.style.backgroundColor = 'var(--background-secondary)';
		});

		// Create body
		const tbody = table.createEl('tbody');
		if (data.length === 0) return;
		data.forEach(row => {
			const tr = tbody.createEl('tr');
			keys.forEach(key => {
				const td = tr.createEl('td');
				td.textContent = row[key];
				td.style.border = '1px solid var(--background-modifier-border)';
				td.style.padding = '8px';
				
				if (key === 'Name of the file') {
					td.style.cursor = 'pointer';
					td.style.color = 'var(--text-accent)';
					td.addEventListener('click', () => {
						const fullPath = ${row['Folder Path to the file']}/${row[key]};
						navigator.clipboard.writeText(fullPath);
					});
				}
			});
		});

		container.appendChild(table);
	}

	async onClose() {
		// Nothing to clean up
	}
}

class TablePluginSettingTab extends PluginSettingTab {
	plugin: TablePlugin;

	constructor(app: App, plugin: TablePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable')
			.setDesc('Enables Plugin')
			.addToggle(toggle =>
			toggle
				.setValue(this.plugin.settings.PluginEnabled)
				.onChange(async (value) => {
				this.plugin.settings.PluginEnabled = value;
				await this.plugin.saveSettings();
				this.plugin.startInterval(this.plugin.settings.DownloadInterval);
        }));

		new Setting(containerEl)
			.setName('Download Interval(min)')
			.setDesc('Time interval to update file Database')
			.addText(text => text
				.setPlaceholder('Minutes')
				.setValue(this.plugin.settings.DownloadInterval)
				.onChange(async (value) => {
					this.plugin.settings.DownloadInterval = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Directory')
			.setDesc('File saving location')
			.addText(text =>
			text
				.setPlaceholder('')
				.setValue(this.plugin.settings.DownloadDirectory)
				.onChange(async (value) => {
				this.plugin.settings.DownloadDirectory = value;
				await this.plugin.saveSettings();
		}));

		new Setting(containerEl)
			.setName('Run Setup')
			.setDesc('Initialize the plugin and download dependencies')
			.addButton(button => button
				.setButtonText('Run Setup')
				.onClick(() => new SetupConfirmModal(this.app, () => this.SyncDatabase("setup")).open()));

		new Setting(containerEl)
			.setName('Reset Data')
			.setDesc('Clear browser data and cookies\nIf you experience any Problems try this')
			.addButton(button => button
				.setButtonText('Reset Data')
				.onClick(() => new ResetConfirmModal(this.app, () => this.resetData()).open()));
	}
}

class ResetConfirmModal extends Modal {
	callback: () => void;

	constructor(app: App, callback: () => void) {
		super(app);
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Are you sure about that' });
		contentEl.createEl('p', { text: 'You will have to log back in' });

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

class SetupConfirmModal extends Modal {
	callback: () => void;

	constructor(app: App, callback: () => void) {
		super(app);
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('p', { text: "This Setup will install a special version of chrome for you if don't have Chrome already installed" });

		const buttonDiv = contentEl.createEl('div');
		buttonDiv.style.display = 'flex';
		buttonDiv.style.gap = '10px';
		buttonDiv.style.justifyContent = 'center';
		buttonDiv.style.marginTop = '20px';

		const understandBtn = buttonDiv.createEl('button', { text: 'I understand' });
		understandBtn.addEventListener('click', () => {
			this.callback();
			this.close();
		});

		const myselfBtn = buttonDiv.createEl('button', { text: "I'll go do it myself" });
		myselfBtn.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}