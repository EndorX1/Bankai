import { App, PluginSettingTab, Setting, Value } from 'obsidian';
import Bankai, { InputConfidentialData } from './main';

export interface BankaiSettings {
	DownloadInterval: number;
	DownloadDirectory: string;
	PluginEnabled: boolean;
	SetupMode: string;
}

export const DEFAULT_SETTINGS: BankaiSettings = {
	DownloadInterval: 10,
	DownloadDirectory: '',
	PluginEnabled: false,
	SetupMode: '0',
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
		
		const descFragment = document.createDocumentFragment();
			descFragment.append(
				'Execute core setup, download dependencies, and apply updates. Refreshes browser cookies to resolve state errors.',
				descFragment.createEl('br'),
				descFragment.createEl('br'),
				descFragment.createEl('strong', { text: 'Requirements: ' }),
				'Linux updates require administrative privileges. Synchronization requires institutional credentials.'
			);

		new Setting(containerEl)
			.setName('Initialize / Update')
			.setDesc(descFragment)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('0', 'Initialize all')
					.addOption('1', 'Refetch Cookies')
					.addOption('2', 'Update Dependencies')
					.addOption('3', 'Update Credentials')
					.setValue(this.plugin.settings.SetupMode)
					.onChange(async (value) => {
						this.plugin.settings.SetupMode = value;
						await this.plugin.saveSettings();
					}))
			.addButton((btn) =>
				btn
					.setButtonText('Initialize')
					.onClick(() => {
						this.plugin.handleInputWindow()
					})
			);
		};
}
