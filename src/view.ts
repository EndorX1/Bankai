import { ItemView, Platform, WorkspaceLeaf } from 'obsidian';
import * as path from 'path';
import Bankai from './main';

export const VIEW_TYPE = "table-view";

const COL_NAME = 'Name of the file';
const COL_SUBJECT = 'Subject';
const COL_FOLDER = 'Folder Path to the file';
const COL_DATE = 'Date Added';

type Row = Record<typeof COL_NAME | typeof COL_SUBJECT | typeof COL_FOLDER | typeof COL_DATE, string>;

export class TableView extends ItemView {
    private plugin: Bankai

    constructor(leaf: WorkspaceLeaf, plugin: Bankai) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE;
    }

    getDisplayText() {
        return "Tableview";
    }

    async reCreateTable(contentEl: Element) {
        contentEl.empty();
        const table = contentEl.createEl('table', { cls: 'table' });
        
        const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
        this.keys.forEach((key) => {
            const th = headerRow.createEl('th');
            th.textContent = key as string;
        });

        const tbody = table.createEl('tbody');
        this.data.forEach((row) => {
            const tr = tbody.createEl('tr');
            this.keys.forEach((key) => {
                const td = tr.createEl('td');
                td.textContent = row[key];
            //TODO add click eventlistenener for dopy
            });
        });
    }

    async onOpen() {
        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginId = this.plugin.manifest.id;
        const pluginPath = path.join(vaultBasePath, '.obsidian', 'plugins', pluginId);
        const targetDir = path.join(vaultBasePath, this.plugin.settings.DownloadDirectory);
        const scriptBin = (() => {
            if (Platform.isWin) {
                const scriptName = 'bankai-api.exe';
                return path.join(pluginPath, scriptName);
            } else if (Platform.isLinux) {
                const scriptName = 'bankai-api';
                return path.join(pluginPath, scriptName);
            } else {
                throw new Error(`Unsupported Operating System: ${navigator.platform}`);
            }
        })();

        const { contentEl } = this;

        const controlsDiv = contentEl.createEl('div', { cls: 'conDiv' });
        controlsDiv.style.marginBottom = '20px';

        const searchInput = controlsDiv.createEl('input');
        searchInput.type = 'text';
		searchInput.placeholder = 'Search files...';
        searchInput.addEventListener('input', () => 
            this.plugin.processErrorHandling(scriptBin, ["-p", pluginPath, "-S", searchInput.value], {
                onStdout: (msg) => {
                    const result = { msg };
                    const jsonOutput = JSON.stringify(result, null, 4);
                    console.log(jsonOutput);
                }
            })
        );

        const buttonsDiv = controlsDiv.createEl('div', { cls: 'butDiv' });
        const nameBtn = buttonsDiv.createEl('button', { text: 'Sort by Name' });
        nameBtn.addEventListener('click', () => 
            this.sortData(COL_NAME)
        );

        const subjectBtn = buttonsDiv.createEl('button', { text: 'Sort by Subject' });
		subjectBtn.addEventListener('click', () => 
            this.sortData(COL_SUBJECT)
        );

        const subjects = [...new Set(this.data.map((row) => row[COL_SUBJECT]))];
        
        const timeBtn = buttonsDiv.createEl('button', { text: 'Sort by Time' });
		timeBtn.addEventListener('click', () => 
            this.sortDataReverse(COL_DATE)
        );

        const subjectButtonsDiv = controlsDiv.createEl('div', { cls: 'butDiv' });

        const allBtn = subjectButtonsDiv.createEl('button', { text: 'All' });
        allBtn.addEventListener('click', () => 
            this.filterBySubject('')
        );

        subjects.forEach((subject) => {
			const btn = subjectButtonsDiv.createEl('button', { text: subject });
			btn.addEventListener('click', () => 
                this.filterBySubject(subject)
            );
		});

        const timeButtonsDiv = controlsDiv.createEl('div', { cls: 'butDiv' });

        const todayBtn = timeButtonsDiv.createEl('button', { text: 'Today' });
		todayBtn.addEventListener('click', () => 
            this.filterByDays(0)
        );

		const daysLabel = timeButtonsDiv.createEl('span', { text: 'Last Days:' });
		daysLabel.style.marginRight = '5px';

		const daysInput = timeButtonsDiv.createEl('input');
		daysInput.type = 'number';
        daysInput.placeholder = '7';
		daysInput.addEventListener('input', () => {
			const days = parseInt(daysInput.value, 10);
			if (!Number.isNaN(days)) this.filterByDays(days);
		});

        this.reCreateTable(contentEl);
    }

    async onClose() {
        this.contentEl.empty();
    }
}