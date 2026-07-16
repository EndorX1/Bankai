import { App, PluginSettingTab, Setting } from 'obsidian';
import Bankai from './main';

export interface PluginSettings {
	DownloadInterval: number;
	DownloadDirectory: string;
	PluginEnabled: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	DownloadInterval: 10,
	DownloadDirectory: '',
	PluginEnabled: true,
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
	}
}
