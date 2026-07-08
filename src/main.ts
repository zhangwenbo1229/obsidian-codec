import { Plugin, Notice, WorkspaceLeaf, Workspace } from 'obsidian';
import { CodecView } from './codec-view';
import { ChainProcessor } from './chain-processor';
import { globalRegistry } from './operation-registry';
import { registerAllOperations } from './operations/registry';
import { VIEW_TYPE, DEFAULT_PLUGIN_STATE } from './constants';
import type { PluginState, OperationConfig } from './types';
import { CodecSettingTab } from './settings';

export default class CodecPlugin extends Plugin {
	data: PluginState = DEFAULT_PLUGIN_STATE;
	chainProcessor!: ChainProcessor;

	async onload() {
		this.data = Object.assign({}, DEFAULT_PLUGIN_STATE, await this.loadData());

		this.chainProcessor = new ChainProcessor(globalRegistry);

		registerAllOperations();

		this.registerView(VIEW_TYPE, (leaf) => new CodecView(leaf, this));

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

		// 注册设置选项卡
		this.addSettingTab(new CodecSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Codec Plugin');
	}

	async activateView() {
		const workspace = this.app.workspace;

		let leaf: WorkspaceLeaf;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (existingLeaves.length > 0) {
			leaf = existingLeaves[0] as WorkspaceLeaf;
		} else {
			// 使用 'tab' 模式在当前视图创建新标签页，而不是分割视图
			leaf = workspace.getLeaf('tab');
		}

		await leaf.setViewState({ type: VIEW_TYPE, active: true });

		await workspace.revealLeaf(leaf);
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
		const activeView = this.app.workspace.getActiveViewOfType(CodecView);
		const editor = (activeView as unknown as { editor?: { replaceSelection: (text: string) => void } } | null)?.editor;
		if (editor) {
			editor.replaceSelection(text);
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
			const existingChain = this.data.savedChains[existingIndex];
			if (!existingChain) {
				return;
			}
			this.data.savedChains[existingIndex] = {
				id: existingChain.id,
				name,
				operations: chain,
				createdAt: existingChain.createdAt,
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

		void this.saveData(this.data);
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

	// 获取系统可用字体
	async getSystemFonts(): Promise<string[]> {
		try {
			// 创建一个临时的测试元素来检测字体
			const testFonts = [
				// 常用中文字体
				'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'STSong', 'STKaiti', 'STXihei',
				// 常用英文字体
				'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Cambria Math',
				'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
				'Lucida Console', 'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI',
				'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana',
				// 等宽字体
				'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Monaco', 'Menlo',
				// 其他
				'Roboto', 'Open Sans', 'Ubuntu', 'Noto Sans'
			];

			// 基础字体用于检测
			const baseFonts = ['monospace', 'sans-serif', 'serif'];
			
			// 创建测试元素
			const testElement = document.createElement('span');
			testElement.style.position = 'absolute';
			testElement.style.visibility = 'hidden';
			testElement.style.fontSize = '72px';
			testElement.textContent = 'mmmmmmmmmmlli';
			document.body.appendChild(testElement);

			// 获取基础字体的宽度
			const baseWidths: Record<string, number> = {};
			baseFonts.forEach(font => {
				testElement.style.fontFamily = font;
				baseWidths[font] = testElement.offsetWidth;
			});

			// 检测每个字体是否可用
			const availableFonts: string[] = [];
			testFonts.forEach(font => {
				let detected = false;
				baseFonts.forEach(base => {
					testElement.style.fontFamily = `'${font}', ${base}`;
					if (testElement.offsetWidth !== baseWidths[base]) {
						detected = true;
					}
				});
				if (detected) {
					availableFonts.push(font);
				}
			});

			// 清理测试元素
			document.body.removeChild(testElement);

			// 添加通用字体家族
			availableFonts.unshift('monospace', 'sans-serif', 'serif');

			// 排序并去重
			return [...new Set(availableFonts)].sort();
		} catch (error) {
			console.error('获取系统字体失败:', error);
			// 返回默认字体列表
			return ['monospace', 'sans-serif', 'serif', 'Arial', 'Consolas', 'Courier New', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana'];
		}
	}

	async updateFontConfig(key: string, value: string): Promise<void> {
		if (!this.data.preferences.fontConfig) {
			this.data.preferences.fontConfig = {};
		}
		(this.data.preferences.fontConfig as Record<string, string>)[key] = value;
		await this.saveData(this.data);
		
		// 更新视图中的字体样式
		const activeView = this.app.workspace.getActiveViewOfType(CodecView);
		if (activeView) {
			activeView.applyFontConfig();
		}
	}

	async resetFontConfig(): Promise<void> {
		this.data.preferences.fontConfig = {};
		await this.saveData(this.data);
		
		// 更新视图中的字体样式
		const activeView = this.app.workspace.getActiveViewOfType(CodecView);
		if (activeView) {
			activeView.applyFontConfig();
		}
	}

	getState(): any {
		return this.data;
	}
}
