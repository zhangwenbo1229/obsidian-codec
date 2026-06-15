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
			attr: { 
				style: 'width: 100%; padding: 8px 12px; border: 1px solid var(--background-modifier-border); border-radius: 4px; font-size: 14px;',
				placeholder: '请输入操作链名称...'
			}
		});

		// 聚焦输入框
		setTimeout(() => nameInput.focus(), 100);

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
		saveButton.addEventListener('click', () => {
			const name = nameInput.value.trim();
			if (!name) {
				new Notice('请输入操作链名称');
				return;
			}

			// 保存操作链逻辑
			this.codecView.saveOperationChainWithName(name);
			this.close();
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
}