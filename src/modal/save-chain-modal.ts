import { App, Modal, Notice } from 'obsidian';
import { CodecView } from '../codec-view';

export class SaveChainModal extends Modal {
	private codecView: CodecView;

	constructor(app: App, codecView: CodecView) {
		super(app);
		this.codecView = codecView;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '保存操作链' });

		const form = contentEl.createEl('div', {
			attr: { style: 'margin-top: 20px;' }
		});

		const inputContainer = form.createEl('div', {
			attr: { style: 'margin-bottom: 20px;' }
		});

		inputContainer.createEl('label', {
			text: '操作链名称:',
			attr: { style: 'display: block; margin-bottom: 8px; font-weight: 500;' }
		});

		const nameInput = inputContainer.createEl('input', {
			type: 'text',
			cls: 'codec-save-chain-name-input',
			attr: { 
				style: 'width: 100%; padding: 8px 12px; border: 1px solid var(--background-modifier-border); border-radius: 4px; font-size: 14px; pointer-events: auto; user-select: text;',
				placeholder: '请输入操作链名称...'
			}
		});

		// 聚焦输入框
		activeWindow.setTimeout(() => nameInput.focus(), 100);
		nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
		nameInput.addEventListener('click', (e) => e.stopPropagation());

		const buttonContainer = form.createEl('div', {
			attr: { style: 'display: flex; gap: 12px; justify-content: flex-end;' }
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: '取消',
			attr: { style: 'padding: 8px 16px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: pointer;' }
		});

		const saveButton = buttonContainer.createEl('button', {
			text: '保存',
			attr: { style: 'padding: 8px 16px; background: var(--interactive-accent); color: var(--text-on-accent); border: none; border-radius: 4px; cursor: pointer;' }
		});

		cancelButton.addEventListener('click', () => this.close());
		saveButton.addEventListener('click', async () => {
			const name = nameInput.value.trim();
			if (!name) {
				new Notice('请输入操作链名称');
				return;
			}

			// 保存操作链逻辑
			saveButton.disabled = true;
			try {
				const saved = await this.codecView.saveOperationChainWithName(name);
				if (saved) {
					this.close();
					activeWindow.setTimeout(() => this.close(), 0);
				} else {
					saveButton.disabled = false;
				}
			} catch (error) {
				saveButton.disabled = false;
				new Notice(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
			}
		});

		// 支持回车键保存
		nameInput.addEventListener('keypress', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				saveButton.click();
			}
		});
	}

	onClose(): void {
		// 清理工作
	}

	close(): void {
		super.close();
		this.containerEl.closest('.modal-container')?.remove();
	}
}
