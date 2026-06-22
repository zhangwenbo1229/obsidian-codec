import { App, PluginSettingTab } from 'obsidian';
import CodecPlugin from './main';

export class CodecSettingTab extends PluginSettingTab {
	plugin: CodecPlugin;

	constructor(app: App, plugin: CodecPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.createEl('p', { text: 'Codec 当前无需额外设置。' });
	}
}
