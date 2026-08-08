import { ItemView, Notice, Platform, WorkspaceLeaf } from 'obsidian';
import * as path from 'path';
import Bankai from './main';

export const VIEW_TYPE = "table-view";

const COL_NAME = 'Name of the file';
const COL_FOLDER = 'Path to the file';
const COL_SUBJECT = 'Subject';
const COL_DATE = 'Date Added';
const columns = [COL_NAME, COL_FOLDER, COL_SUBJECT, COL_DATE];

export class TableView extends ItemView {
    private plugin: Bankai
    private struct: any = null;

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

    async reCreateTable(table: Element) {
        table.empty()

        const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
        columns.forEach((key) => {
            const th = headerRow.createEl('th');
            th.textContent = key as string;
        });

        console.log("struct", this.struct);
        const files = Array.isArray(this.struct?.files) ? this.struct.files : [];
        console.log("files", files);
        const tbody = table.createEl('tbody');
        files.forEach((file: any) => {
            const tr = tbody.createEl('tr');
            columns.forEach((column) => {
                const td = tr.createEl('td');
                let value = '';

                if (column === COL_NAME) {
                    value = file.name ?? '';
                } else if (column === COL_FOLDER) {
                    value = file.path ?? '';
                } else if (column === COL_SUBJECT) {
                    value = file.subject ?? '';
                } else if (column === COL_DATE) {
                    value = file.time ? new Date(file.time * 1000).toLocaleString() : '';
                }

                td.textContent = value;
            //TODO add click eventlistener for copy path
            });
        });
        return table
    }

    async pullPythonData(sBin: string, args: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.plugin.processErrorHandling(sBin, args, {
                onStdout: (msg) => {
                    try {
                        const pythonData = JSON.parse(msg) as any;
                        console.log(JSON.stringify(pythonData, null, 4));
                        resolve(pythonData);
                    } catch (error) {
                        console.error("Failed to parse Python output as JSON:", error);
                        console.log("Raw Python output was:", msg);
                        resolve({});
                    }
                },
                onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
                onFail: (code) => reject(new Error(`Python process failed with exit code ${code}`)),
            });
        });
    }

    mngArgs(targetDir: string, Search: string, NameS: boolean, SubjectS: boolean, TimeS: boolean, SubjectF: string, DaysF: number): string[] {
        const args = ["-r", targetDir]
        var sorts = ""
        if (Search) {
            args.push("-S", Search)
        }
        if (NameS) {
            sorts += "n"
        }
        if (SubjectS) {
            sorts += "s"
        }
        if (TimeS) {
            sorts += "t"
        }
        args.push("--sort", sorts)
        if (SubjectF) {
            args.push("--subject", SubjectF)
        }
        if (DaysF !== 0) {
            args.push("-d", DaysF.toString())
        }
        return args
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

        const { contentEl } = this

        let namePressed = false;
        let subjectPressed = false;
        let timePressed = false;
        let SubjectF = ""
        let DaysF = 0
        const SubjectBtns: HTMLButtonElement[] = []
        let todayPressed = false

        const controlsDiv = contentEl.createEl('div', { cls: 'butDiv' });

        const searchInput = controlsDiv.createEl('input', { cls: 'search' });
        searchInput.type = 'text';
		searchInput.placeholder = 'Search files...';
        searchInput.addEventListener('input', async () => {
                this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
                this.reCreateTable(table)
                });

        const buttonsDiv = controlsDiv.createEl('div', { cls: 'butDiv' });
        
        const nameBtn = buttonsDiv.createEl('button', { text: 'Sort by Name', cls: 'button' });
        nameBtn.addEventListener('click', async () => {
            namePressed = !namePressed;
            const isPressed = namePressed;
            nameBtn.style.backgroundColor = isPressed ? '#4caf50' : '';
            nameBtn.style.color = isPressed ? 'white' : '';
            this.struct = await await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
        });

        const subjectBtn = buttonsDiv.createEl('button', { text: 'Sort by Subject', cls: 'button' });
		subjectBtn.addEventListener('click', async () => {
            subjectPressed = !subjectPressed;
            subjectBtn.style.backgroundColor = subjectPressed ? '#4caf50' : '';
            subjectBtn.style.color = subjectPressed ? 'white' : '';
            this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
            });
        
        const timeBtn = buttonsDiv.createEl('button', { text: 'Sort by Time', cls: 'button' });
		timeBtn.addEventListener('click', async () => {
            timePressed = !timePressed;
            timeBtn.style.backgroundColor = timePressed ? '#4caf50' : '';
            timeBtn.style.color = timePressed ? 'white' : '';
            this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
            });


        //Filters

        const subjectButtonsDiv = controlsDiv.createEl('div', { cls: 'butDiv' });

        const allBtn = subjectButtonsDiv.createEl('button', { text: 'All', cls: 'button' });
        allBtn.addEventListener('click', async () => {
            SubjectF = ""
            SubjectBtns.forEach((b) => {
                        b.dataset.pressed = 'false';
                        b.style.backgroundColor = '';
                        b.style.color = '';
                    });
            this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
            });

        this.struct = await await this.pullPythonData(scriptBin, ["-r", targetDir, "--subjects"]);
        const subjects = Array.isArray(this.struct?.subjects) ? this.struct.subjects : [];

        subjects.forEach((subject: string) => {
			const btn = subjectButtonsDiv.createEl('button', { text: subject, cls: 'button' }) as HTMLButtonElement;
            btn.dataset.pressed = 'false';
            SubjectBtns.push(btn);
			btn.addEventListener('click', async () => {
                const isPressed = btn.dataset.pressed === 'true';
                const nextPressed = !isPressed;
                btn.dataset.pressed = String(nextPressed);
                btn.style.backgroundColor = nextPressed ? '#4caf50' : '';
                btn.style.color = nextPressed ? 'white' : '';
                SubjectF = nextPressed ? subject : "";
                if (nextPressed) {
                    SubjectBtns.forEach((b) => {
                        if (b !== btn) {
                            b.dataset.pressed = 'false';
                            b.style.backgroundColor = '';
                            b.style.color = '';
                        }
                    });
                }
                this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
                this.reCreateTable(table)
            });
	    });

        const timeButtonsDiv = controlsDiv.createEl('div', { cls: 'butdiv' });

        const todayBtn = timeButtonsDiv.createEl('button', { text: 'Today', cls: 'button' });
		todayBtn.addEventListener('click', async () => {
            todayPressed = !todayPressed;
            todayBtn.style.backgroundColor = todayPressed ? '#4caf50' : '';
            todayBtn.style.color = todayPressed ? 'white' : '';
            DaysF = 1
            this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
            });

		const daysLabel = timeButtonsDiv.createEl('span', { text: 'Last Days:' });

		const daysInput = timeButtonsDiv.createEl('input');
		daysInput.type = 'number';
        daysInput.placeholder = '7';
		daysInput.addEventListener('input', async () => {
            todayPressed = false;
            todayBtn.style.backgroundColor = '';
            todayBtn.style.color = '';
            DaysF = parseInt(daysInput.value);
            this.struct = await this.pullPythonData(scriptBin, this.mngArgs(targetDir, searchInput.value, namePressed, subjectPressed, timePressed, SubjectF, DaysF));
            this.reCreateTable(table)
            });

        const table = contentEl.createEl('table', { cls: 'table' });
        this.reCreateTable(table);
    }

    async onClose() {
        this.contentEl.empty();
    }
}