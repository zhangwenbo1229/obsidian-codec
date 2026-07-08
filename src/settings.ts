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

		// 标题
		this.containerEl.createEl('h2', { text: 'Codec 设置' });

		// 字体配置部分
		this.containerEl.createEl('h3', { text: '字体配置' });
		
		this.containerEl.createEl('p', { text: '自定义输入框和输出框的字体样式' });

		// 异步加载系统字体
		this.renderFontConfig();
	}

	private async renderFontConfig(): Promise<void> {
		try {
			// 获取系统字体
			const systemFonts = await this.plugin.getSystemFonts();

			// 输入框字体家族
			const inputFontFamilyContainer = this.containerEl.createEl('div', { cls: 'setting-item' });
			inputFontFamilyContainer.createEl('div', { cls: 'setting-item-info' })
				.createEl('div', { text: '输入框字体家族', cls: 'setting-item-name' });
			
			const inputFontFamilySelect = inputFontFamilyContainer.createEl('select', {
				cls: 'dropdown',
				attr: { style: 'margin-top: 8px; width: 100%; padding: 4px;' }
			});
			
			// 添加默认选项
			const defaultOption = inputFontFamilySelect.createEl('option', { value: '', text: '使用默认字体' });
			if (!this.plugin.getState().preferences.fontConfig?.inputFontFamily) {
				defaultOption.selected = true;
			}
			
			// 添加系统字体选项
			systemFonts.forEach(font => {
				const option = inputFontFamilySelect.createEl('option', { value: font, text: font });
				if (font === (this.plugin.getState().preferences.fontConfig?.inputFontFamily || '')) {
					option.selected = true;
				}
			});
			
			inputFontFamilySelect.addEventListener('change', async (event) => {
				const value = (event.target as HTMLSelectElement).value;
				await this.plugin.updateFontConfig('inputFontFamily', value);
			});

			// 输入框字体大小
			const inputFontSizeContainer = this.containerEl.createEl('div', { cls: 'setting-item' });
			inputFontSizeContainer.createEl('div', { cls: 'setting-item-info' })
				.createEl('div', { text: '输入框字体大小', cls: 'setting-item-name' });
			
			const inputFontSizeSelect = inputFontSizeContainer.createEl('select', {
				cls: 'dropdown',
				attr: { style: 'margin-top: 8px; width: 100%; padding: 4px;' }
			});
			
			const fontSizes = [
				{ value: '', text: '使用默认大小' },
				{ value: '12px', text: '12px' },
				{ value: '13px', text: '13px' },
				{ value: '14px', text: '14px' },
				{ value: '15px', text: '15px' },
				{ value: '16px', text: '16px' },
				{ value: '18px', text: '18px' },
				{ value: '20px', text: '20px' },
				{ value: '1em', text: '1em' },
				{ value: '1.1em', text: '1.1em' },
				{ value: '1.2em', text: '1.2em' }
			];
			
			fontSizes.forEach(size => {
				const option = inputFontSizeSelect.createEl('option', { value: size.value, text: size.text });
				if (size.value === (this.plugin.getState().preferences.fontConfig?.inputFontSize || '')) {
					option.selected = true;
				}
			});
			
			inputFontSizeSelect.addEventListener('change', async (event) => {
				const value = (event.target as HTMLSelectElement).value;
				await this.plugin.updateFontConfig('inputFontSize', value);
			});

			// 输出框字体家族
			const outputFontFamilyContainer = this.containerEl.createEl('div', { cls: 'setting-item' });
			outputFontFamilyContainer.createEl('div', { cls: 'setting-item-info' })
				.createEl('div', { text: '输出框字体家族', cls: 'setting-item-name' });
			
			const outputFontFamilySelect = outputFontFamilyContainer.createEl('select', {
				cls: 'dropdown',
				attr: { style: 'margin-top: 8px; width: 100%; padding: 4px;' }
			});
			
			// 添加默认选项
			const outputDefaultOption = outputFontFamilySelect.createEl('option', { value: '', text: '使用默认字体' });
			if (!this.plugin.getState().preferences.fontConfig?.outputFontFamily) {
				outputDefaultOption.selected = true;
			}
			
			// 添加系统字体选项
			systemFonts.forEach(font => {
				const option = outputFontFamilySelect.createEl('option', { value: font, text: font });
				if (font === (this.plugin.getState().preferences.fontConfig?.outputFontFamily || '')) {
					option.selected = true;
				}
			});
			
			outputFontFamilySelect.addEventListener('change', async (event) => {
				const value = (event.target as HTMLSelectElement).value;
				await this.plugin.updateFontConfig('outputFontFamily', value);
			});

			// 输出框字体大小
			const outputFontSizeContainer = this.containerEl.createEl('div', { cls: 'setting-item' });
			outputFontSizeContainer.createEl('div', { cls: 'setting-item-info' })
				.createEl('div', { text: '输出框字体大小', cls: 'setting-item-name' });
			
			const outputFontSizeSelect = outputFontSizeContainer.createEl('select', {
				cls: 'dropdown',
				attr: { style: 'margin-top: 8px; width: 100%; padding: 4px;' }
			});
			
			fontSizes.forEach(size => {
				const option = outputFontSizeSelect.createEl('option', { value: size.value, text: size.text });
				if (size.value === (this.plugin.getState().preferences.fontConfig?.outputFontSize || '')) {
					option.selected = true;
				}
			});
			
			outputFontSizeSelect.addEventListener('change', async (event) => {
				const value = (event.target as HTMLSelectElement).value;
				await this.plugin.updateFontConfig('outputFontSize', value);
			});

			// 重置按钮
			const resetButtonContainer = this.containerEl.createEl('div', { cls: 'setting-item' });
			const resetButton = resetButtonContainer.createEl('button', { 
				text: '重置为默认字体',
				attr: { style: 'margin-top: 8px; padding: 6px 12px; cursor: pointer;' }
			});
			resetButton.addEventListener('click', async () => {
				await this.plugin.resetFontConfig();
				// 重新加载设置界面以显示重置后的值
				this.display();
			});
		} catch (error) {
			console.error('加载字体配置失败:', error);
			this.containerEl.createEl('p', { 
				text: '字体配置加载失败，请重试',
				attr: { style: 'color: var(--text-error);' }
			});
		}
	}
}
