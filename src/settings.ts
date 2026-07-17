import { App, PluginSettingTab, Setting } from 'obsidian';
import Bankai, { InputConfidentialData } from './main';

export interface BankaiSettings {
	DownloadInterval: number;
	DownloadDirectory: string;
	PluginEnabled: boolean;
}

export const DEFAULT_SETTINGS: BankaiSettings = {
	DownloadInterval: 10,
	DownloadDirectory: '',
	PluginEnabled: false,
};

export class BankaiSettingTab extends PluginSettingTab {
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
			.setDesc('Enable or disable the plugin')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.PluginEnabled)
					.onChange(async (value) => {
						this.plugin.settings.PluginEnabled = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.startTimer();
						} else {
							this.plugin.stopTimer();
						}
					}),
			);

		new Setting(containerEl)
			.setName('Download Interval (minutes)')
			.setDesc('Interval between automatic sync runs')
			.addText((text) =>
				text
					.setPlaceholder('10')
					.setValue(String(this.plugin.settings.DownloadInterval))
					.onChange(async (value) => {
						const minutes = parseInt(value, 10);
						this.plugin.settings.DownloadInterval = Number.isNaN(minutes)
							? DEFAULT_SETTINGS.DownloadInterval
							: minutes;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Download Directory')
			.setDesc('Local directory for downloaded files')
			.addText((text) =>
				text
					.setPlaceholder('')
					.setValue(this.plugin.settings.DownloadDirectory)
					.onChange(async (value) => {
						this.plugin.settings.DownloadDirectory = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Initialize / Update')
			.setDesc('Initialize the plugin, download dependencies or Update if possible\nRefetch browser cookies. If you experience problems, try this.')
			.addButton((button) => {
				button
					.setButtonText('Run Setup')
					.onClick(() => this.plugin.bankaiInit());
			});

		new Setting(containerEl)
			.setName('Set Secure Login Data')
			.setDesc('Input the administrative password and service account details required for synchronization.')
            .addButton((btn) =>
                btn 
                    .setButtonText("Open Window")
                    .onClick(() => {
						this.plugin.handleInputWindow()
                    })
            );
	}
}
