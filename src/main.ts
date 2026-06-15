import { Plugin, Notice, WorkspaceLeaf, Workspace } from 'obsidian';
import { CodecView } from './codec-view';
import { ChainProcessor } from './chain-processor';
import { globalRegistry } from './operation-registry';
import { registerAllOperations } from './operations/registry';
import { VIEW_TYPE, DEFAULT_PLUGIN_STATE } from './constants';
import type { PluginState, OperationConfig } from './types';

export default class CodecPlugin extends Plugin {
	data: PluginState = DEFAULT_PLUGIN_STATE;
	chainProcessor!: ChainProcessor;

	async onload() {
		this.data = Object.assign({}, DEFAULT_PLUGIN_STATE, await this.loadData());

		this.chainProcessor = new ChainProcessor(globalRegistry);

		registerAllOperations();

		this.registerView(VIEW_TYPE, (leaf) => new CodecView(leaf as WorkspaceLeaf, this));

		this.addRibbonIcon('settings', '打开 Codec', (evt: MouseEvent) => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-codec-view',
			name: '打开 Codec',
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: 'send-to-codec',
			name: '发送选中内容到 Codec',
			editorCallback: (editor, ctx) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					void this.sendToCodec(selectedText);
				} else {
					new Notice('请先选择文本');
				}
			},
		});

		this.addCommand({
			id: 'quick-base64-encode',
			name: '快速 Base64 编码',
			editorCallback: (editor, ctx) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					void this.quickOperation('base64-encode', selectedText, editor);
				} else {
					new Notice('请先选择文本');
				}
			},
		});

		this.addCommand({
			id: 'quick-base64-decode',
			name: '快速 Base64 解码',
			editorCallback: (editor, ctx) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					void this.quickOperation('base64-decode', selectedText, editor);
				} else {
					new Notice('请先选择文本');
				}
			},
		});

		this.addCommand({
			id: 'move-to-codec-input',
			name: '移动选中内容到 Codec 输入框',
			editorCallback: (editor, ctx) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					void this.moveToInput(selectedText);
				} else {
					new Notice('请先选择文本');
				}
			},
		});
	}

	onunload() {
		console.log('Unloading Codec Plugin');
	}

	async activateView() {
		const workspace = this.app.workspace as Workspace;

		let leaf: WorkspaceLeaf | null = null;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (existingLeaves.length > 0) {
			leaf = existingLeaves[0];
		} else {
			// 使用 'tab' 模式在当前视图创建新标签页，而不是分割视图
			leaf = workspace.getLeaf('tab');
		}

		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	get globalRegistry() {
		return globalRegistry;
	}

	showMessage(message: string): void {
		new Notice(message);
	}

	async sendToCodec(text: string): Promise<void> {
		await this.activateView();
		
		const activeView = this.app.workspace.getActiveViewOfType(CodecView);
		if (activeView?.containerEl) {
			const inputArea = activeView.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
			if (inputArea) {
				inputArea.value = text;
				inputArea.dispatchEvent(new Event('input', { bubbles: true }));
			}
		}
	}

	async moveToInput(text: string): Promise<void> {
		await this.activateView();
		
		const activeView = this.app.workspace.getActiveViewOfType(CodecView);
		if (activeView?.containerEl) {
			const inputArea = activeView.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
			if (inputArea) {
				// 追加模式：在现有内容后添加
				inputArea.value += text;
				inputArea.dispatchEvent(new Event('input', { bubbles: true }));
				new Notice('内容已移动到输入框');
			}
		}
	}

	async quickOperation(operationId: string, text: string, editor: any): Promise<void> {
		try {
			const result = await this.chainProcessor.executeChain(text, [
				{ operationId, config: {} }
			]);

			if (result.success) {
				editor.replaceSelection(result.data);
				new Notice('操作成功');
			} else {
				new Notice(`操作失败: ${result.error}`);
			}
		} catch (error) {
			new Notice(`操作出错: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	replaceSelectedText(text: string): void {
		const activeView = this.app.workspace.getActiveViewOfType<any>();
		if (activeView && activeView.editor) {
			activeView.editor.replaceSelection(text);
			new Notice('文本已替换');
		} else {
			new Notice('没有活动的编辑器');
		}
	}

	saveOperationChain(name: string, chain: OperationConfig[]): void {
		if (!this.data.savedChains) {
			this.data.savedChains = [];
		}

		const existingIndex = this.data.savedChains.findIndex(c => c.name === name);
		if (existingIndex >= 0) {
			this.data.savedChains[existingIndex] = {
				id: this.data.savedChains[existingIndex].id,
				name,
				operations: chain,
				createdAt: this.data.savedChains[existingIndex].createdAt,
				lastUsed: Date.now()
			};
		} else {
			this.data.savedChains.push({
				id: `chain-${Date.now()}`,
				name,
				operations: chain,
				createdAt: Date.now(),
				lastUsed: Date.now()
			});
		}

		if (chain.lastUsed) {
			void this.saveData(this.data);
		}
	}

	loadOperationChain(chainId: string): OperationConfig[] | null {
		const chain = this.data.savedChains?.find(c => c.id === chainId);
		if (chain) {
			chain.lastUsed = Date.now();
			void this.saveData(this.data);
			return chain.operations;
		}
		return null;
	}

	getSavedChains(): any[] {
		return this.data.savedChains || [];
	}
}