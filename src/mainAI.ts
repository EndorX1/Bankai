import { App, ItemView, Plugin, WorkspaceLeaf, PluginSettingTab, Setting, Notice } from 'obsidian';

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

	async onload() {
		await this.loadSettings();

		this.addCommand({ id: 'SyncDB', name: 'Sync Database', callback: () => this.showSyncModal() });

		this.registerView(VIEW_TYPE_TABLE, (leaf) => new TableView(leaf, this));

		this.addRibbonIcon('table', 'Open Database Searcher', () => {
			this.activateView();
		});

		this.addSettingTab(new BankaiSettingTab(this.app, this));
	}

	onunload() {}

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async isExeRunning(exeName: string): Promise<boolean> {
		return false;
	}

	async activateView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TABLE);

		const existingLeaf = leaves.length > 0 ? leaves[0] ?? null : null;
		const newLeaf = workspace.getRightLeaf(false);
		let leaf: WorkspaceLeaf | null = existingLeaf ?? newLeaf ?? null;
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_TABLE, active: true });
			workspace.revealLeaf(leaf);
		}
	}

	async setup() {}

	async sync() {}

	decodeApiOutput(apiJson: string) {}

	showSyncModal() {}
}

class TableView extends ItemView {
	private plugin: Bankai;
	private allData: Row[] = [];
	private filteredData: Row[] = [];
	private syncTime: string = '';
	private syncButton: HTMLButtonElement | null = null;

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

		const headerDiv = container.createEl('div');
		headerDiv.style.display = 'flex';
		headerDiv.style.justifyContent = 'space-between';
		headerDiv.style.alignItems = 'center';
		headerDiv.style.marginBottom = '20px';

		headerDiv.createEl('h2', { text: 'Data Table' });

		try {
			this.allData = await this.loadJsonData();
			this.filteredData = [...this.allData];

			const rightDiv = headerDiv.createEl('div');
			rightDiv.style.display = 'flex';
			rightDiv.style.alignItems = 'center';
			rightDiv.style.gap = '15px';

			const syncContainer = rightDiv.createEl('div');
			syncContainer.style.display = 'flex';
			syncContainer.style.alignItems = 'center';
			syncContainer.style.gap = '8px';

			const spinner = syncContainer.createEl('div');
			spinner.className = 'loader';
			spinner.style.display = 'none';
			spinner.style.fontSize = '12px';
			spinner.style.width = '1em';
			spinner.style.height = '1em';

			const syncBtn = syncContainer.createEl('button', { text: 'Sync' });
			this.syncButton = syncBtn;
			this.syncButton.setAttribute('data-spinner', spinner.outerHTML);
			syncBtn.style.padding = '6px 12px';
			syncBtn.style.backgroundColor = 'var(--interactive-accent)';
			syncBtn.style.color = 'var(--text-on-accent)';
			syncBtn.style.border = 'none';
			syncBtn.style.borderRadius = '4px';
			syncBtn.style.cursor = 'pointer';
			syncBtn.style.fontWeight = '500';
			syncBtn.addEventListener('click', () => this.plugin.showSyncModal());
			syncBtn.addEventListener('mouseenter', () => {
				syncBtn.style.backgroundColor = 'var(--interactive-accent-hover)';
			});
			syncBtn.addEventListener('mouseleave', () => {
				syncBtn.style.backgroundColor = 'var(--interactive-accent)';
			});

			const reloadBtn = rightDiv.createEl('button', { text: 'Reload' });
			reloadBtn.style.padding = '4px 8px';
			reloadBtn.addEventListener('click', () => this.reloadData());

			const syncDiv = rightDiv.createEl('div');
			syncDiv.style.textAlign = 'right';
			syncDiv.style.fontSize = '0.9em';
			syncDiv.style.color = 'var(--text-muted)';
			if (this.syncTime) {
				syncDiv.createEl('div', { text: 'Last Synced:' });
				syncDiv.createEl('div', { text: this.syncTime });
			}

			this.createControls(container);
			this.createTable(container, this.filteredData);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			container.createEl('p', { text: 'Error loading data: ' + msg });
		}
	}

	private async loadJsonData(): Promise<Row[]> {
		return [];
	}

	async reloadData() {}

	private extractFiles(data: any): Row[] {
		return [];
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
		if (field === COL_DATE) {
			this.filteredData.sort((a, b) => {
				const dateA = new Date(a[field]).getTime() || 0;
				const dateB = new Date(b[field]).getTime() || 0;
				return dateA - dateB;
			});
		} else {
			this.filteredData.sort((a, b) => a[field].localeCompare(b[field]));
		}
		this.updateTable();
	}

	private sortDataReverse(field: keyof Row) {
		if (field === COL_DATE) {
			this.filteredData.sort((a, b) => {
				const dateA = new Date(a[field]).getTime();
				const dateB = new Date(b[field]).getTime();
				return dateB - dateA;
			});
		} else {
			this.filteredData.sort((a, b) => b[field].localeCompare(a[field]));
		}
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
		const cutoffStr = cutoff.toISOString().split('T')[0] ?? '';
		this.filteredData = this.allData.filter((item) => {
			const datePart = item[COL_DATE].split(' ')[0];
			return datePart !== undefined && datePart >= cutoffStr;
		});
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

		const firstRow = data[0];
		if (!firstRow) return;

		const keys = Object.keys(firstRow) as (keyof Row)[];

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

	updateSyncButton(isLoading: boolean) {
		if (!this.syncButton) return;

		const spinner = this.syncButton.parentElement?.querySelector('.loader') as HTMLElement;
		if (!spinner) return;

		if (isLoading) {
			this.syncButton.textContent = 'Syncing...';
			this.syncButton.disabled = true;
			this.syncButton.style.cursor = 'not-allowed';
			spinner.style.display = 'inline-block';

			if (!document.querySelector('#sync-spinner-style')) {
				const style = document.createElement('style');
				style.id = 'sync-spinner-style';
				style.textContent = `
					.loader {
						color: var(--text-accent);
						text-indent: -9999em;
						overflow: hidden;
						border-radius: 50%;
						position: relative;
						transform: translateZ(0);
						animation: mltShdSpin 2s infinite ease, round 2s infinite ease;
					}
					@keyframes mltShdSpin {
						0% { box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em; }
						5%, 95% { box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em; }
						10%, 59% { box-shadow: 0 -0.83em 0 -0.4em, -0.087em -0.825em 0 -0.42em, -0.173em -0.812em 0 -0.44em, -0.256em -0.789em 0 -0.46em, -0.297em -0.775em 0 -0.477em; }
						20% { box-shadow: 0 -0.83em 0 -0.4em, -0.338em -0.758em 0 -0.42em, -0.555em -0.617em 0 -0.44em, -0.671em -0.488em 0 -0.46em, -0.749em -0.34em 0 -0.477em; }
						38% { box-shadow: 0 -0.83em 0 -0.4em, -0.377em -0.74em 0 -0.42em, -0.645em -0.522em 0 -0.44em, -0.775em -0.297em 0 -0.46em, -0.82em -0.09em 0 -0.477em; }
						100% { box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em, 0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em; }
					}
					@keyframes round {
						0% { transform: rotate(0deg) }
						100% { transform: rotate(360deg) }
					}
				`;
				document.head.appendChild(style);
			}
		} else {
			this.syncButton.textContent = 'Sync';
			this.syncButton.disabled = false;
			this.syncButton.style.cursor = 'pointer';
			spinner.style.display = 'none';
		}
	}

	async onClose() {}
}