import { ItemView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import { VIEW_TYPE } from './constants';
import CodecPlugin from './main';
import { SaveChainModal } from './modal/save-chain-modal';
import { ChainStateManager, OperationChainItemController, OperationRuntimeState } from './chain-state';

export class CodecView extends ItemView {
	private plugin: CodecPlugin;
	private chainContainer!: HTMLElement;
	private inputArea!: HTMLTextAreaElement;
	private outputArea!: HTMLTextAreaElement;
	private immediateExecutionCheckbox: HTMLInputElement | null = null;
	private statsUpdateInterval: number | null = null;
	
	// 状态管理相关属性
	private chainStateManager?: ChainStateManager;
	private itemControllers: Map<string, OperationChainItemController> = new Map();
	private currentBreakpointIndex: number = -1;
	private isBreakpointMode: boolean = false;
	private historyMenuCloseHandler: ((e: MouseEvent) => void) | null = null;
	private historyMenuCloseTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CodecPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Codec';
	}

	getIcon(): string {
		return 'codec';
	}

	async onOpen(): Promise<void> {
		this.render();
		this.setupEventHandlers();
	}

	async onClose(): Promise<void> {
		this.closeHistoryMenu();
		if (this.statsUpdateInterval !== null) {
			window.clearInterval(this.statsUpdateInterval);
			this.statsUpdateInterval = null;
		}
	}

	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		
		container.empty();
		
		this.renderThreePanelLayout(container);
		
		// 应用字体配置
		// 使用 setTimeout 确保 DOM 完全渲染后再应用字体
		setTimeout(() => {
			this.applyFontConfig();
		}, 100);
	}

	private renderThreePanelLayout(container: HTMLElement): void {
		const layout = container.createDiv({
			cls: 'codec-container codec-layout',
			attr: { style: 'display: flex; height: 100%; gap: var(--codec-space-md); padding: var(--codec-space-lg); --codec-operation-library-height: calc(100vh - 260px); --codec-chain-panel-height: calc(100vh - 300px); --codec-io-panel-height: calc(100vh - 170px);' }
		});

		const leftPanel = layout.createDiv({
			cls: 'codec-left-panel',
			attr: { style: 'width: 25%; min-width: 200px; border-right: 1px solid var(--background-modifier-border); padding-right: 10px;' }
		});
		this.renderOperationLibrary(leftPanel);

		const middlePanel = layout.createDiv({
			cls: 'codec-middle-panel',
			attr: { style: 'width: 50%; min-width: 300px; border-right: 1px solid var(--background-modifier-border); padding-right: 10px;' }
		});
		this.renderOperationChainPanel(middlePanel);

		const rightPanel = layout.createDiv({
			cls: 'codec-right-panel',
			attr: { style: 'width: 25%; min-width: 200px;' }
		});
		this.renderInputOutputPanel(rightPanel);
	}

	private renderOperationLibrary(panel: HTMLElement): void {
		panel.createEl('h3', { text: '操作库' });
		
		const searchBox = panel.createEl('input', {
			type: 'text',
			cls: 'codec-search',
			attr: { placeholder: '搜索操作...' }
		});

		const operationList = panel.createEl('div', {
			cls: 'codec-operation-list',
			attr: { style: 'margin-top: 10px; max-height: calc(100vh - 260px) !important; overflow-y: auto; position: relative; z-index: 1;' }
		});

		this.renderOperationsList(operationList);
	}

	private renderOperationsList(container: HTMLElement): void {
		const { globalRegistry } = this.plugin;
		const operations = globalRegistry.listAll();

		container.empty();
		
		const groupedOps = {
			encoding: operations.filter(op => op.category === 'encoding'),
			decoding: operations.filter(op => op.category === 'decoding'),
			hash: operations.filter(op => op.category === 'hash'),
			encryption: operations.filter(op => op.category === 'encryption'),
			decryption: operations.filter(op => op.category === 'decryption'),
			beautify: operations.filter(op => op.category === 'beautify'),
			dataFormat: operations.filter(op => op.category === 'data-format'),
			extractAnalysis: operations.filter(op => op.category === 'extract-analysis'),
			urlIp: operations.filter(op => op.category === 'url-ip'),
			datetime: operations.filter(op => op.category === 'datetime'),
			mac: operations.filter(op => op.category === 'mac'),
			other: operations.filter(op => op.category === 'other')
		};

		this.renderOperationCategory(container, '编码', groupedOps.encoding);
		this.renderOperationCategory(container, '解码', groupedOps.decoding);
		this.renderOperationCategory(container, '哈希', groupedOps.hash);
		this.renderOperationCategory(container, '加密', groupedOps.encryption);
		this.renderOperationCategory(container, '解密', groupedOps.decryption);
		this.renderOperationCategory(container, '数据美化', groupedOps.beautify);
		this.renderOperationCategory(container, '数据格式', groupedOps.dataFormat);
		this.renderOperationCategory(container, '提取分析', groupedOps.extractAnalysis);
		this.renderOperationCategory(container, 'URL/IP', groupedOps.urlIp);
		this.renderOperationCategory(container, '时间日期', groupedOps.datetime);
		this.renderOperationCategory(container, 'MAC', groupedOps.mac);
		this.renderOperationCategory(container, '其他', groupedOps.other);
		
		// 重新绑定拖拽事件
		this.bindDragEvents();
	}

	private renderOperationCategory(container: HTMLElement, title: string, operations: any[]): void {
		if (operations.length === 0) return;

		const category = container.createEl('div', {
			cls: 'codec-operation-category',
			attr: { style: 'margin-bottom: 15px;' }
		});

		const header = category.createEl('div', {
			cls: 'codec-category-header',
			attr: { 
				style: 'display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 4px; user-select: none;',
				'data-category': title
			}
		});

		header.createEl('h4', { 
			text: title,
			attr: { style: 'margin: 0; font-size: 14px; font-weight: bold;' }
		});

		const toggleIcon = header.createEl('span', {
			cls: 'codec-category-toggle',
			attr: { style: 'font-size: 12px; transition: transform 0.2s;' },
			text: '▼'
		});

		const operationsContainer = category.createEl('div', {
			cls: 'codec-category-operations',
			attr: { style: 'display: none;' } // 默认折叠状态
		});

		operations.forEach(operation => {
			const opCard = operationsContainer.createEl('div', {
				cls: 'codec-operation-card',
				attr: { 
					style: 'padding: 8px; margin-bottom: 5px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: grab;',
					'draggable': 'true',
					'data-operation-id': operation.id
				}
			});

			// 操作名称容器（可能包含格式选择器）
			const nameContainer = opCard.createEl('div', {
				attr: { style: 'display: flex; justify-content: space-between; align-items: center;' }
			});

			nameContainer.createEl('div', { 
				text: operation.name,
				attr: { style: 'font-weight: 500;' }
			});

			opCard.createEl('div', { 
				text: operation.description,
				attr: { style: 'font-size: 12px; color: var(--text-muted); margin-top: 2px;' }
			});
		});

		header.addEventListener('click', () => {
			const isCollapsed = operationsContainer.style.display === 'none';
			operationsContainer.style.display = isCollapsed ? 'block' : 'none';
			toggleIcon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
			toggleIcon.textContent = isCollapsed ? '▼' : '▶';
			
			// 添加或移除 expanded 类
			if (isCollapsed) {
				operationsContainer.classList.add('expanded');
			} else {
				operationsContainer.classList.remove('expanded');
			}
		});
	}

	private renderOperationChainPanel(panel: HTMLElement): void {
		const panelHeader = panel.createEl('div', {
			cls: 'codec-panel-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;' }
		});

		panelHeader.createEl('h3', { 
			text: '操作链',
			attr: { style: 'margin: 0; font-size: 15px; font-weight: 600;' }
		});

		const chainToolbar = panelHeader.createEl('div', {
			cls: 'chain-toolbar-container'
		});

		// 保存操作链按钮
		const saveChainButton = chainToolbar.createEl('button', {
			cls: 'toolbar-button codec-save-button',
			attr: {
				'aria-label': '保存操作链',
				'title': '保存操作链'
			}
		});
		setIcon(saveChainButton, 'lucide-save');
		saveChainButton.addEventListener('click', () => this.showSaveChainModal());

		// 历史记录按钮
		const historyButton = chainToolbar.createEl('button', {
			cls: 'toolbar-button codec-history-button',
			attr: {
				'aria-label': '历史记录',
				'title': '历史记录'
			}
		});
		setIcon(historyButton, 'clock');
		historyButton.addEventListener('mouseenter', () => {
			if (!this.containerEl.querySelector('.codec-history-menu')) {
				this.showChainHistory();
			}
		});
		historyButton.addEventListener('click', () => this.showChainHistory());

		// 清空操作链按钮
		const clearButton = chainToolbar.createEl('button', {
			cls: 'toolbar-button'
		});
		setIcon(clearButton, 'trash');
		clearButton.addEventListener('click', () => this.clearOperationChain());

		const chainContainer = panel.createEl('div', {
			cls: 'codec-chain-container',
			attr: { 
				style: 'height: var(--codec-chain-panel-height); overflow-y: auto; border: 2px dashed var(--background-modifier-border); border-radius: 8px; padding: 17px; background: var(--background-primary);',
				'data-chain-container': 'true'
			}
		});

		chainContainer.createEl('div', {
			cls: 'codec-chain-placeholder',
			attr: { 
				'style': 'text-align: center; color: var(--text-muted); padding: 40px 20px;',
				'data-placeholder': 'true'
			},
			text: '拖拽操作到此区域构建操作链'
		});

		// 添加执行区域容器
		const executionContainer = panel.createEl('div', {
			cls: 'codec-execution-container',
			attr: { 
				style: 'position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin: 0 0 8px 0; padding: 10px 12px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: var(--codec-shadow-sm); z-index: 10;'
			}
		});

		// 立即执行复选框
		const immediateCheckbox = executionContainer.createEl('input', {
			type: 'checkbox',
			attr: {
				'id': 'immediate-execution-checkbox',
				'style': 'width: 16px; height: 16px; cursor: pointer;'
			}
		});

		const immediateLabel = executionContainer.createEl('label', {
			text: '立即执行',
			attr: {
				'for': 'immediate-execution-checkbox',
				'style': 'font-size: 13px; color: var(--text-normal); cursor: pointer; user-select: none;'
			}
		});

		// 执行按钮
		const executeButton = executionContainer.createEl('button', {
			cls: 'toolbar-button codec-execute-button',
			attr: {
				'aria-label': '执行操作链',
				'title': '执行操作链',
				'style': 'margin-left: auto;'
			}
		});
		setIcon(executeButton, 'play');
		executeButton.addEventListener('click', () => this.executeOperationChain());

		// 存储引用以便后续访问
		this.immediateExecutionCheckbox = immediateCheckbox;

		// 添加继续执行容器
		const continueContainer = panel.createEl('div', {
			cls: 'codec-continue-container',
			attr: { 
				'data-continue-container': 'true',
				'style': 'display: none;'
			}
		});

		const continueButton = continueContainer.createEl('button', {
			cls: 'codec-continue-button'
		});
		
		// 添加图标
		setIcon(continueButton, 'play-circle');
		
		// 添加文本
		continueButton.createEl('span', {
			text: '继续执行'
		});
		
		continueButton.addEventListener('click', () => {
			this.continueExecution();
		});

		this.chainContainer = chainContainer;
	}

	private renderInputOutputPanel(panel: HTMLElement): void {
		panel.createEl('h3', { text: '输入/输出' });
		
		// 添加flex布局以支持自适应高度
		panel.style.display = 'flex';
		panel.style.flexDirection = 'column';
		panel.style.height = 'calc(100vh - 170px)';

		const inputSection = panel.createEl('div', {
			cls: 'codec-input-section',
			attr: { style: 'margin-bottom: 15px; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column;' }
		});

		const inputHeader = inputSection.createEl('div', {
			cls: 'codec-input-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' }
		});

		inputHeader.createEl('label', { 
			text: '输入:',
			attr: { style: 'display: block; font-weight: 500; margin: 0;' }
		});

		const inputStats = inputHeader.createEl('span', {
			cls: 'codec-input-stats',
			attr: { style: 'font-size: 11px; color: var(--text-muted); font-weight: 400; margin-right: auto; margin-left: 8px;' },
			text: '0B 0字符 0行'
		});

		const importInputButton = inputHeader.createEl('span', {
			cls: 'codec-import-input-btn',
			attr: { style: 'color: var(--text-accent); cursor: pointer; font-size: 13px; font-weight: 500; user-select: none; margin-right: 12px;' },
			text: '导入'
		});

		importInputButton.addEventListener('click', async () => {
			await this.importFileToInput();
		});

		const selectFileButton = inputHeader.createEl('span', {
			cls: 'codec-select-file-btn',
			attr: { style: 'color: var(--text-accent); cursor: pointer; font-size: 13px; font-weight: 500; user-select: none; margin-right: 12px;' },
			text: '选中'
		});

		selectFileButton.addEventListener('click', async () => {
			await this.selectFileAsInput();
		});

		const clearInputButton = inputHeader.createEl('span', {
			cls: 'codec-clear-input-btn',
			attr: { style: 'color: red; cursor: pointer; font-size: 13px; font-weight: 500; user-select: none;' },
			text: '清空'
		});

		const inputArea = inputSection.createEl('textarea', {
			cls: 'codec-input-area',
			attr: { 
				style: 'width: 100%; flex: 1 1 0; min-height: 0 !important; padding: 8px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace;',
				placeholder: '输入要处理的文本...'
			}
		});

		clearInputButton.addEventListener('click', () => {
			inputArea.value = '';
			inputArea.dispatchEvent(new Event('input'));
		});
		
		// 添加输入变化监听器
		inputArea.addEventListener('input', () => {
			this.updateTextStats(inputArea, inputStats);
			this.checkImmediateExecution();
		});

		const outputSection = panel.createEl('div', {
			cls: 'codec-output-section',
			attr: { style: 'margin-bottom: 0; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column;' }
		});

		const outputHeader = outputSection.createEl('div', {
			cls: 'codec-output-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' }
		});

		outputHeader.createEl('label', { 
			text: '输出:',
			attr: { style: 'display: block; font-weight: 500; margin: 0;' }
		});

		const outputStats = outputHeader.createEl('span', {
			cls: 'codec-output-stats',
			attr: { style: 'font-size: 11px; color: var(--text-muted); font-weight: 400; margin-right: auto; margin-left: 8px;' },
			text: '0B 0字符 0行'
		});

		const outputToolbar = outputHeader.createEl('div', {
			cls: 'codec-output-toolbar',
			attr: { style: 'display: flex; gap: 12px;' }
		});

		const saveButton = outputToolbar.createEl('button', {
			cls: 'toolbar-button codec-save-output-btn'
		});
		setIcon(saveButton, 'download');

		const replaceButton = outputToolbar.createEl('button', {
			cls: 'toolbar-button codec-replace-output-btn'
		});
		setIcon(replaceButton, 'replace');

		const copyButton = outputToolbar.createEl('button', {
			cls: 'toolbar-button codec-copy-output-btn'
		});
		setIcon(copyButton, 'copy');

		const outputArea = outputSection.createEl('textarea', {
			cls: 'codec-output-area',
			attr: { 
				style: 'width: 100%; flex: 1 1 0; min-height: 0 !important; padding: 8px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace; readonly: true;'
			}
		});

		this.setupTextStatsUpdater(inputArea, inputStats, outputArea, outputStats);

		saveButton.addEventListener('click', () => this.saveOutputToFile(outputArea));
		replaceButton.addEventListener('click', () => {
			inputArea.value = outputArea.value;
			inputArea.dispatchEvent(new Event('input'));
		});
		copyButton.addEventListener('click', () => {
			navigator.clipboard.writeText(outputArea.value);
			new Notice('已复制到剪贴板');
		});

		this.inputArea = inputArea;
		this.outputArea = outputArea;
	}

	private setupEventHandlers(): void {
		// 设置拖拽功能
		this.setupDragAndDrop();

		// 设置按钮事件
		this.setupButtonHandlers();

		// 设置搜索和筛选
		this.setupSearchHandlers();
	}

	private bindDragEvents(): void {
		const operationCards = this.containerEl.querySelectorAll('.codec-operation-card');
		
		operationCards.forEach((card) => {
			// 移除旧的事件监听器，避免重复绑定
			card.removeEventListener('dragstart', () => {});
			card.removeEventListener('dragend', () => {});
			
			card.addEventListener('dragstart', (e: Event) => {
				const dragEvent = e as DragEvent;
				const operationId = card.getAttribute('data-operation-id');
				if (dragEvent.dataTransfer) {
					dragEvent.dataTransfer.setData('operation-id', operationId || '');
					dragEvent.dataTransfer.effectAllowed = 'copy';
					
					// 对于 Base64 编码，包含格式信息
					if (operationId === 'base64-encode') {
						const format = card.getAttribute('data-format') || 'standard';
						dragEvent.dataTransfer.setData('operation-config', JSON.stringify({ format }));
					}
				}
				(card as HTMLElement).style.opacity = '0.5';
			});

			card.addEventListener('dragend', (e: Event) => {
				(card as HTMLElement).style.opacity = '1';
			});
		});
	}

	private setupDragAndDrop(): void {
		// 初始化拖放区域的事件监听
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;

		chainContainer?.addEventListener('dragover', (e: DragEvent) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'copy';
			}
		});

		chainContainer?.addEventListener('drop', (e: DragEvent) => {
			e.preventDefault();
			const operationId = e.dataTransfer?.getData('operation-id');
			if (operationId) {
				let config: any = {};
				
				// 对于 Base64 编码，获取格式配置
				if (operationId === 'base64-encode') {
					const configData = e.dataTransfer?.getData('operation-config');
					if (configData) {
						try {
							config = JSON.parse(configData);
						} catch (error) {
							console.error('Failed to parse operation config:', error);
						}
					}
				}
				
				this.addOperationToChain(operationId, config);
			}
		});
	}

	private setupButtonHandlers(): void {
		const executeButton = this.containerEl.querySelector('.codec-execute-button');
		const clearButton = this.containerEl.querySelector('.codec-clear-button');
		const copyButton = this.containerEl.querySelector('.codec-copy-button');
		const replaceButton = this.containerEl.querySelector('.codec-replace-button');

		executeButton?.addEventListener('click', () => this.executeOperationChain());
		clearButton?.addEventListener('click', () => this.clearOperationChain());
		copyButton?.addEventListener('click', () => this.copyResult());
		replaceButton?.addEventListener('click', () => this.replaceSelectedText());
	}

	private setupSearchHandlers(): void {
		const searchBox = this.containerEl.querySelector('.codec-search') as HTMLInputElement;
		const categoryFilter = this.containerEl.querySelector('.codec-category-filter') as HTMLSelectElement;

		searchBox?.addEventListener('input', (e) => {
			const query = (e.target as HTMLInputElement).value;
			this.filterOperations(query, categoryFilter?.value || '');
		});

		categoryFilter?.addEventListener('change', (e) => {
			const category = (e.target as HTMLSelectElement).value;
			this.filterOperations(searchBox?.value || '', category);
		});
	}

	private updateTextStats(textArea: HTMLTextAreaElement, statsElement?: HTMLElement | null): void {
		if (!statsElement) {
			return;
		}

		const text = textArea.value;
		const bytes = new TextEncoder().encode(text).length;
		const chars = Array.from(text).length;
		const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
		statsElement.textContent = `${bytes}B ${chars}字符 ${lines}行`;
	}

	private setupTextStatsUpdater(
		inputArea: HTMLTextAreaElement,
		inputStats: HTMLElement,
		outputArea: HTMLTextAreaElement,
		outputStats: HTMLElement
	): void {
		this.updateTextStats(inputArea, inputStats);
		this.updateTextStats(outputArea, outputStats);

		if (this.statsUpdateInterval !== null) {
			window.clearInterval(this.statsUpdateInterval);
		}

		this.statsUpdateInterval = window.setInterval(() => {
			this.updateTextStats(inputArea, inputStats);
			this.updateTextStats(outputArea, outputStats);
		}, 300);
	}

	private filterOperations(query: string, category: string): void {
		const { globalRegistry } = this.plugin;
		let operations = globalRegistry.listAll();

		if (category) {
			operations = globalRegistry.getByCategory(category as any);
		}

		if (query) {
			operations = globalRegistry.search(query);
		}

		const operationList = this.containerEl.querySelector('.codec-operation-list') as HTMLElement;
		if (operationList) {
			this.renderOperationsList(operationList);
		}
	}

	private addOperationToChain(operationId: string, config?: any): void {
		const { globalRegistry } = this.plugin;
		const operation = globalRegistry.get(operationId);

		if (!operation) return;

		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const placeholder = chainContainer.querySelector('[data-placeholder]');

		if (placeholder) {
			placeholder.remove();
		}

		// 创建操作链项
		const chainItem = chainContainer.createEl('div', {
			cls: 'codec-chain-item',
			attr: { 
				'data-operation-id': operation.id,
				'data-chain-operation-id': operation.id
			}
		});

		// 保存配置到操作链项
		if (config && Object.keys(config).length > 0) {
			chainItem.setAttribute('data-config', JSON.stringify(config));
		}

		// 创建控制器
		const controller = new OperationChainItemController(chainItem);
		this.itemControllers.set(operation.id, controller);

		// 创建内容容器
		const content = chainItem.createEl('div', {
			cls: 'codec-chain-item-content',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; width: 100%;' }
		});

		// 操作信息
		const info = content.createEl('div');
		info.createEl('div', {
			cls: 'codec-chain-item-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;' }
		}).createEl('span', { text: operation.name });
		
		info.createEl('div', {
			cls: 'codec-chain-item-description',
			text: operation.description || '',
			attr: { style: 'font-size: 12px; color: var(--codec-text-muted);' }
		});

		// 为 Base64 操作添加格式选择器
		if (operation.id === 'base64-encode' || operation.id === 'base64-decode') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentFormat = config.format as string || 'standard';

			const formatContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '格式: ',
				attr: { style: 'font-size: 11px; color: var(--text-muted); margin-right: 4px;' }
			});

			const formatSelector = formatContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			formatSelector.createEl('option', { value: 'standard', text: '标准格式' });
			formatSelector.createEl('option', { value: 'url-safe', text: 'URL安全格式' });

			formatSelector.value = currentFormat;

			formatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const newConfig = { ...config, format: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为图片转Base64操作添加配置UI
		if (operation.id === 'image-to-base64') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentFormat = config.format as string || 'data-url';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 输出格式标签
			const formatLabel = configContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			// 格式选项容器
			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px; flex-wrap: wrap;' }
			});

			const formats = [
				{ value: 'data-url', text: 'Data URL' },
				{ value: 'html-img', text: 'HTML标签' }
			];

			formats.forEach(format => {
				const formatOption = formatContainer.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				
				const formatRadioInput = formatOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'image-base64-format',
						value: format.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				
				if (format.value === currentFormat) {
					formatRadioInput.checked = true;
				}
				
				formatOption.createSpan({ text: format.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let format = 'data-url';
				const formatInput = formatContainer.querySelector('input[name="image-base64-format"]:checked') as HTMLInputElement;
				if (formatInput) {
					format = formatInput.value;
				}

				const newConfig = { ...config, format };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			formatContainer.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为Base64转图片操作添加配置UI
		if (operation.id === 'base64-to-image') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentOutputFormat = config.outputFormat as string || 'preview';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 输出格式标签
			const formatLabel = configContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			// 格式选项容器
			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px; flex-wrap: wrap;' }
			});

			const formats = [
				{ value: 'preview', text: '预览' },
				{ value: 'file', text: '保存文件' }
			];

			formats.forEach(format => {
				const formatOption = formatContainer.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				
				const formatRadioInput = formatOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'base64-image-format',
						value: format.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				
				if (format.value === currentOutputFormat) {
					formatRadioInput.checked = true;
				}
				
				formatOption.createSpan({ text: format.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let outputFormat = 'preview';
				const formatInput = formatContainer.querySelector('input[name="base64-image-format"]:checked') as HTMLInputElement;
				if (formatInput) {
					outputFormat = formatInput.value;
				}

				const newConfig = { ...config, outputFormat };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			formatContainer.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 字符集转UTF-8配置
		if (operation.id === 'to-utf8') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentCharset = config.sourceCharset as string || 'gb-18030';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const charsetContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const charsetLabel = charsetContainer.createEl('label', {
				text: '源字符集:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const charsetSelector = charsetContainer.createEl('select', {
				cls: 'codec-charset-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			const charsets = [
				{ value: 'ascii', text: 'ASCII' },
				{ value: 'gb-18030', text: 'GB 18030 (简体中文)' },
				{ value: 'windows-1252', text: 'Windows-1252 (西欧)' },
				{ value: 'iso-8859-1', text: 'ISO-8859-1 (西欧)' },
				{ value: 'big5', text: 'Big5 (繁体中文)' },
				{ value: 'utf-16', text: 'UTF-16' }
			];

			charsets.forEach(charset => {
				const option = charsetSelector.createEl('option', { value: charset.value, text: charset.text });
				if (charset.value === currentCharset) {
					option.selected = true;
				}
			});

			const hint = configContainer.createEl('div', {
				text: '将指定字符集的文本转换为UTF-8编码',
				attr: { style: 'font-size: 10px; color: var(--text-muted);' }
			});

			charsetSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				const newConfig = { ...parsedConfig, sourceCharset: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// UTF-8转字符集配置
		if (operation.id === 'from-utf8') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentCharset = config.targetCharset as string || 'gb-18030';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const charsetContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const charsetLabel = charsetContainer.createEl('label', {
				text: '目标字符集:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const charsetSelector = charsetContainer.createEl('select', {
				cls: 'codec-charset-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			const charsets = [
				{ value: 'ascii', text: 'ASCII' },
				{ value: 'gb-18030', text: 'GB 18030 (简体中文)' },
				{ value: 'windows-1252', text: 'Windows-1252 (西欧)' },
				{ value: 'iso-8859-1', text: 'ISO-8859-1 (西欧)' },
				{ value: 'big5', text: 'Big5 (繁体中文)' },
				{ value: 'utf-16', text: 'UTF-16' }
			];

			charsets.forEach(charset => {
				const option = charsetSelector.createEl('option', { value: charset.value, text: charset.text });
				if (charset.value === currentCharset) {
					option.selected = true;
				}
			});

			const hint = configContainer.createEl('div', {
				text: '将UTF-8编码的文本转换为指定字符集',
				attr: { style: 'font-size: 10px; color: var(--text-muted);' }
			});

			charsetSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				const newConfig = { ...parsedConfig, targetCharset: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (operation.id === 'find-replace') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const findInput = configContainer.createEl('input', {
				type: 'text',
				cls: 'codec-find-input',
				attr: {
					placeholder: '查找内容',
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});
			findInput.value = config.find as string || '';

			const replaceInput = configContainer.createEl('input', {
				type: 'text',
				cls: 'codec-replace-input',
				attr: {
					placeholder: '替换为',
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});
			replaceInput.value = config.replaceWith as string || '';

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				const newConfig = {
					...parsedConfig,
					find: findInput.value,
					replaceWith: replaceInput.value
				};
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			findInput.addEventListener('input', updateConfig);
			replaceInput.addEventListener('input', updateConfig);
			updateConfig();
		}

		if (operation.id === 'add-line-affix') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const positionContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 10px; align-items: center; font-size: 11px;' }
			});

			const startLabel = positionContainer.createEl('label', {
				attr: { style: 'display: flex; gap: 4px; align-items: center; cursor: pointer;' }
			});
			const startRadio = startLabel.createEl('input', {
				type: 'radio',
				attr: { name: `affix-position-${Date.now()}-${Math.random()}`, value: 'start' }
			});
			startLabel.createSpan({ text: '行首' });

			const endLabel = positionContainer.createEl('label', {
				attr: { style: 'display: flex; gap: 4px; align-items: center; cursor: pointer;' }
			});
			const endRadio = endLabel.createEl('input', {
				type: 'radio',
				attr: { name: startRadio.name, value: 'end' }
			});
			endLabel.createSpan({ text: '行尾' });

			const textInput = configContainer.createEl('input', {
				type: 'text',
				cls: 'codec-affix-text-input',
				attr: {
					placeholder: '添加内容',
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);'
				}
			});

			const dedupeLabel = configContainer.createEl('label', {
				attr: { style: 'display: flex; gap: 6px; align-items: center; font-size: 11px; cursor: pointer;' }
			});
			const dedupeCheckbox = dedupeLabel.createEl('input', { type: 'checkbox' });
			dedupeLabel.createSpan({ text: '是否去重' });

			startRadio.checked = (config.position ?? 'start') !== 'end';
			endRadio.checked = config.position === 'end';
			textInput.value = config.text as string || '';
			dedupeCheckbox.checked = Boolean(config.deduplicate);

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					position: endRadio.checked ? 'end' : 'start',
					text: textInput.value,
					deduplicate: dedupeCheckbox.checked
				}));
			};

			startRadio.addEventListener('change', updateConfig);
			endRadio.addEventListener('change', updateConfig);
			textInput.addEventListener('input', updateConfig);
			dedupeCheckbox.addEventListener('change', updateConfig);
			updateConfig();
		}

		if (operation.id === 'line-to-symbol') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const symbolInput = configContainer.createEl('input', {
				type: 'text',
				cls: 'codec-line-symbol-input',
				attr: {
					placeholder: '替换符号',
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);'
				}
			});
			symbolInput.value = config.symbol as string || ',';

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					symbol: symbolInput.value
				}));
			};

			symbolInput.addEventListener('input', updateConfig);
			updateConfig();
		}

		if (operation.id === 'convert-ip-format') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const formats = [
				{ value: 'dotted', text: '点分十进制' },
				{ value: 'decimal', text: '十进制' },
				{ value: 'hex', text: '十六进制' },
				{ value: 'octal', text: '八进制' }
			];

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const inputLabel = configContainer.createEl('label', {
				text: '输入格式',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});
			const inputFormatSelector = configContainer.createEl('select', {
				cls: 'codec-ip-input-format',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);' }
			});

			const outputLabel = configContainer.createEl('label', {
				text: '输出格式',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});
			const outputFormatSelector = configContainer.createEl('select', {
				cls: 'codec-ip-output-format',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);' }
			});

			for (const format of formats) {
				const inputOption = inputFormatSelector.createEl('option', { value: format.value, text: format.text });
				if (format.value === (config.inputFormat || 'dotted')) {
					inputOption.selected = true;
				}
				const outputOption = outputFormatSelector.createEl('option', { value: format.value, text: format.text });
				if (format.value === (config.outputFormat || 'decimal')) {
					outputOption.selected = true;
				}
			}

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					inputFormat: inputFormatSelector.value,
					outputFormat: outputFormatSelector.value
				}));
			};

			inputFormatSelector.addEventListener('change', updateConfig);
			outputFormatSelector.addEventListener('change', updateConfig);
			updateConfig();
		}

		if (operation.id === 'url-encode') {
			const currentConfig = chainItem.getAttribute('data-config');
			const urlConfig = currentConfig ? JSON.parse(currentConfig) : {};
			const encodeAll = urlConfig.encodeAll as boolean || false;

			const formatContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; align-items: center; gap: 6px;' }
			});

			const checkbox = formatContainer.createEl('input', {
				type: 'checkbox',
				attr: {
					style: 'cursor: pointer; width: 14px; height: 14px;'
				}
			});

			const checkboxLabel = formatContainer.createEl('label', {
				text: '全部编码',
				attr: { style: 'font-size: 11px; color: var(--text-muted); cursor: pointer;' }
			});

			checkbox.checked = encodeAll;

			checkbox.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				const newConfig = { ...urlConfig, encodeAll: target.checked };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为HTML实体编码操作添加格式选择器
		if (operation.id === 'html-entity-encode') {
			const currentConfig = chainItem.getAttribute('data-config');
			const htmlConfig = currentConfig ? JSON.parse(currentConfig) : {};
			const htmlFormat = htmlConfig.format as string || 'named';

			const formatContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '实体格式: ',
				attr: { style: 'font-size: 11px; color: var(--text-muted); margin-right: 4px;' }
			});

			const formatSelector = formatContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			formatSelector.createEl('option', { value: 'named', text: 'Named格式' });
			formatSelector.createEl('option', { value: 'decimal', text: 'DEC格式' });
			formatSelector.createEl('option', { value: 'hex', text: 'HEX格式' });

			formatSelector.value = htmlFormat;

			formatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const newConfig = { ...htmlConfig, format: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// 添加全部编码勾选框
			const checkboxContainer = formatContainer.createEl('div', {
				attr: { style: 'margin-top: 6px; display: flex; align-items: center; gap: 6px;' }
			});

			const encodeAllCheckbox = checkboxContainer.createEl('input', {
				type: 'checkbox',
				attr: {
					style: 'cursor: pointer; width: 14px; height: 14px;'
				}
			});

			const checkboxLabel = checkboxContainer.createEl('label', {
				text: '全部编码',
				attr: { style: 'font-size: 11px; color: var(--text-muted); cursor: pointer;' }
			});

			encodeAllCheckbox.checked = htmlConfig.encodeAll as boolean || false;

			encodeAllCheckbox.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				const newConfig = { ...htmlConfig, encodeAll: target.checked };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为JSON美化操作添加处理方式选项
		if (operation.id === 'json-prettify') {
			const currentConfig = chainItem.getAttribute('data-config');
			const jsonConfig = currentConfig ? JSON.parse(currentConfig) : {};
			const currentIndent = jsonConfig.indent as number || 2;

			const formatContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; align-items: center; gap: 6px;' }
			});

			const label = formatContainer.createEl('label', {
				text: '处理方式: ',
				attr: { style: 'font-size: 11px; color: var(--text-muted); margin-right: 4px;' }
			});

			const indentSelector = formatContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			indentSelector.createEl('option', { value: '2', text: '2格缩进' });
			indentSelector.createEl('option', { value: '4', text: '4格缩进' });
			indentSelector.createEl('option', { value: '0', text: '压缩' });

			indentSelector.value = currentIndent.toString();

			indentSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const newConfig = { ...jsonConfig, indent: parseInt(target.value) };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为DES/3DES加密操作添加配置UI
		if (['des-encrypt', 'triple-des-encrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const encryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// Key配置
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 10px; padding: 2px 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			keyFormatSelector.createEl('option', { value: 'raw', text: 'Raw' });
			keyFormatSelector.createEl('option', { value: 'hex', text: 'Hex' });
			keyFormatSelector.createEl('option', { value: 'base64', text: 'Base64' });

			keyInput.value = encryptConfig.key || '';
			keyFormatSelector.value = encryptConfig.keyFormat || 'raw';

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// IV配置
			const ivContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const ivLabel = ivContainer.createEl('label', {
				text: '初始化向量(IV):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const ivInputRow = ivContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const ivInput = ivInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-iv-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入IV (ECB模式不需要)'
				}
			});

			const ivFormatSelector = ivInputRow.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 10px; padding: 2px 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			ivFormatSelector.createEl('option', { value: 'raw', text: 'Raw' });
			ivFormatSelector.createEl('option', { value: 'hex', text: 'Hex' });
			ivFormatSelector.createEl('option', { value: 'base64', text: 'Base64' });

			ivInput.value = encryptConfig.iv || '';
			ivFormatSelector.value = encryptConfig.ivFormat || 'raw';

			ivInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, iv: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, ivFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// 模式和输出格式配置
			const modeContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const modeGroup = modeContainer.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const modeLabel = modeGroup.createEl('label', {
				text: '加密模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const modeSelector = modeGroup.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			modeSelector.createEl('option', { value: 'CBC', text: 'CBC' });
			modeSelector.createEl('option', { value: 'ECB', text: 'ECB' });

			modeSelector.value = encryptConfig.mode || 'CBC';

			if (encryptConfig.mode === 'ECB') {
				ivContainer.style.display = 'none';
			}

			modeSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, mode: target.value as 'CBC' | 'ECB' };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
				
				if (target.value === 'ECB') {
					ivContainer.style.display = 'none';
				} else {
					ivContainer.style.display = 'flex';
				}
			});

			// 输出格式配置
			const outputGroup = modeContainer.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputLabel = outputGroup.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputSelector = outputGroup.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			outputSelector.createEl('option', { value: 'hex', text: 'Hex' });
			outputSelector.createEl('option', { value: 'base64', text: 'Base64' });
			outputSelector.createEl('option', { value: 'raw', text: 'Raw' });

			outputSelector.value = encryptConfig.outputFormat || 'hex';

			outputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, outputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// 填充模式配置
			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingSelector = paddingContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			paddingSelector.createEl('option', { value: 'PKCS7', text: 'PKCS7' });
			paddingSelector.createEl('option', { value: 'ZeroPadding', text: 'ZeroPadding' });

			paddingSelector.value = encryptConfig.padding || 'PKCS7';

			paddingSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, padding: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为DES/3DES解密操作添加配置UI
		if (['des-decrypt', 'triple-des-decrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const decryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// Key配置
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 10px; padding: 2px 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			keyFormatSelector.createEl('option', { value: 'raw', text: 'Raw' });
			keyFormatSelector.createEl('option', { value: 'hex', text: 'Hex' });
			keyFormatSelector.createEl('option', { value: 'base64', text: 'Base64' });

			keyInput.value = decryptConfig.key || '';
			keyFormatSelector.value = decryptConfig.keyFormat || 'raw';

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// IV配置
			const ivContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const ivLabel = ivContainer.createEl('label', {
				text: '初始化向量(IV):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const ivInputRow = ivContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const ivInput = ivInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-iv-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入IV (ECB模式不需要)'
				}
			});

			const ivFormatSelector = ivInputRow.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 10px; padding: 2px 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			ivFormatSelector.createEl('option', { value: 'raw', text: 'Raw' });
			ivFormatSelector.createEl('option', { value: 'hex', text: 'Hex' });
			ivFormatSelector.createEl('option', { value: 'base64', text: 'Base64' });

			ivInput.value = decryptConfig.iv || '';
			ivFormatSelector.value = decryptConfig.ivFormat || 'raw';

			ivInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, iv: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, ivFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// 模式和输入格式配置
			const modeContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const modeGroup = modeContainer.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const modeLabel = modeGroup.createEl('label', {
				text: '加密模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const modeSelector = modeGroup.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			modeSelector.createEl('option', { value: 'CBC', text: 'CBC' });
			modeSelector.createEl('option', { value: 'ECB', text: 'ECB' });

			modeSelector.value = decryptConfig.mode || 'CBC';

			if (decryptConfig.mode === 'ECB') {
				ivContainer.style.display = 'none';
			}

			modeSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, mode: target.value as 'CBC' | 'ECB' };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
				
				if (target.value === 'ECB') {
					ivContainer.style.display = 'none';
				} else {
					ivContainer.style.display = 'flex';
				}
			});

			// 输入格式配置
			const inputGroup = modeContainer.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const inputLabel = inputGroup.createEl('label', {
				text: '输入格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const inputSelector = inputGroup.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			inputSelector.createEl('option', { value: 'hex', text: 'Hex' });
			inputSelector.createEl('option', { value: 'base64', text: 'Base64' });
			inputSelector.createEl('option', { value: 'raw', text: 'Raw' });

			inputSelector.value = decryptConfig.inputFormat || 'hex';

			inputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, inputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			// 填充模式配置
			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingSelector = paddingContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: {
					style: 'font-size: 11px; padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			paddingSelector.createEl('option', { value: 'PKCS7', text: 'PKCS7' });
			paddingSelector.createEl('option', { value: 'ZeroPadding', text: 'ZeroPadding' });

			paddingSelector.value = decryptConfig.padding || 'PKCS7';

			paddingSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, padding: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['aes-encrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const encryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.keyFormat || 'raw')) {
					option.selected = true;
				}
			});

			const ivContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const ivLabel = ivContainer.createEl('label', {
				text: '初始化向量(IV):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const ivInputRow = ivContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const ivInput = ivInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-iv-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入IV (ECB模式不需要)'
				}
			});

			const ivFormatSelector = ivInputRow.createEl('select', {
				cls: 'codec-iv-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = ivFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.ivFormat || 'raw')) {
					option.selected = true;
				}
			});

			const modeOutputRow = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 8px;' }
			});

			const modeGroup = modeOutputRow.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const modeLabel = modeGroup.createEl('label', {
				text: '加密模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const modeSelector = modeGroup.createEl('select', {
				cls: 'codec-mode-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['CBC', 'ECB', 'CTR'].forEach(mode => {
				const option = modeSelector.createEl('option', { value: mode, text: mode });
				if (mode === (encryptConfig.mode || 'CBC')) {
					option.selected = true;
				}
			});

			const outputGroup = modeOutputRow.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputLabel = outputGroup.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputSelector = outputGroup.createEl('select', {
				cls: 'codec-output-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'base64', 'raw'].forEach(format => {
				const option = outputSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.outputFormat || 'hex')) {
					option.selected = true;
				}
			});

			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingSelector = paddingContainer.createEl('select', {
				cls: 'codec-padding-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['PKCS7', 'ZeroPadding'].forEach(padding => {
				const option = paddingSelector.createEl('option', { value: padding, text: padding });
				if (padding === (encryptConfig.padding || 'PKCS7')) {
					option.selected = true;
				}
			});

			if (encryptConfig.mode === 'ECB') {
				ivContainer.style.display = 'none';
			}

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, iv: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, ivFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			modeSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, mode: target.value as 'CBC' | 'ECB' | 'CTR' };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));

				if (target.value === 'ECB') {
					ivContainer.style.display = 'none';
				} else {
					ivContainer.style.display = 'flex';
				}
			});

			outputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, outputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			paddingSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, padding: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['aes-decrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const decryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.keyFormat || 'raw')) {
					option.selected = true;
				}
			});

			const ivContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const ivLabel = ivContainer.createEl('label', {
				text: '初始化向量(IV):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const ivInputRow = ivContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const ivInput = ivInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-iv-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入IV (ECB模式不需要)'
				}
			});

			const ivFormatSelector = ivInputRow.createEl('select', {
				cls: 'codec-iv-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = ivFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.ivFormat || 'raw')) {
					option.selected = true;
				}
			});

			const modeInputRow = configContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 8px;' }
			});

			const modeGroup = modeInputRow.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const modeLabel = modeGroup.createEl('label', {
				text: '加密模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const modeSelector = modeGroup.createEl('select', {
				cls: 'codec-mode-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['CBC', 'ECB', 'CTR'].forEach(mode => {
				const option = modeSelector.createEl('option', { value: mode, text: mode });
				if (mode === (decryptConfig.mode || 'CBC')) {
					option.selected = true;
				}
			});

			const inputGroup = modeInputRow.createEl('div', {
				attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 2px;' }
			});

			const inputLabel = inputGroup.createEl('label', {
				text: '输入格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const inputSelector = inputGroup.createEl('select', {
				cls: 'codec-input-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'base64', 'raw'].forEach(format => {
				const option = inputSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.inputFormat || 'hex')) {
					option.selected = true;
				}
			});

			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充模式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingSelector = paddingContainer.createEl('select', {
				cls: 'codec-padding-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['PKCS7', 'ZeroPadding'].forEach(padding => {
				const option = paddingSelector.createEl('option', { value: padding, text: padding });
				if (padding === (decryptConfig.padding || 'PKCS7')) {
					option.selected = true;
				}
			});

			if (decryptConfig.mode === 'ECB') {
				ivContainer.style.display = 'none';
			}

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, iv: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			ivFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, ivFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			modeSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, mode: target.value as 'CBC' | 'ECB' | 'CTR' };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));

				if (target.value === 'ECB') {
					ivContainer.style.display = 'none';
				} else {
					ivContainer.style.display = 'flex';
				}
			});

			inputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, inputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			paddingSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, padding: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['aes-gcm-encrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const encryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.keyFormat || 'raw')) {
					option.selected = true;
				}
			});

			const nonceContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const nonceLabel = nonceContainer.createEl('label', {
				text: 'Nonce/IV:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const nonceInputRow = nonceContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const nonceInput = nonceInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-nonce-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入Nonce'
				}
			});

			const nonceFormatSelector = nonceInputRow.createEl('select', {
				cls: 'codec-nonce-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = nonceFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.nonceFormat || 'raw')) {
					option.selected = true;
				}
			});

			const nonceLengthContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const nonceLengthLabel = nonceLengthContainer.createEl('label', {
				text: 'Nonce长度:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const nonceLengthSelector = nonceLengthContainer.createEl('select', {
				cls: 'codec-nonce-length-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			[12, 16].forEach(length => {
				const option = nonceLengthSelector.createEl('option', { value: String(length), text: `${length}字节` });
				if (length === (encryptConfig.nonceLength || 12)) {
					option.selected = true;
				}
			});

			const outputContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputLabel = outputContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputSelector = outputContainer.createEl('select', {
				cls: 'codec-output-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'base64', 'raw'].forEach(format => {
				const option = outputSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (encryptConfig.outputFormat || 'hex')) {
					option.selected = true;
				}
			});

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonce: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonceFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceLengthSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonceLength: parseInt(target.value) as 12 | 16 };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			outputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, outputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['aes-gcm-decrypt'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const decryptConfig = currentConfig ? JSON.parse(currentConfig) : {};

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥(Key):',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInputRow = keyContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const keyInput = keyInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});

			const keyFormatSelector = keyInputRow.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.keyFormat || 'raw')) {
					option.selected = true;
				}
			});

			const nonceContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const nonceLabel = nonceContainer.createEl('label', {
				text: 'Nonce/IV:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const nonceInputRow = nonceContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 4px;' }
			});

			const nonceInput = nonceInputRow.createEl('input', {
				type: 'text',
				cls: 'codec-nonce-input',
				attr: {
					style: 'flex: 1; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入Nonce'
				}
			});

			const nonceFormatSelector = nonceInputRow.createEl('select', {
				cls: 'codec-nonce-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['raw', 'hex', 'base64'].forEach(format => {
				const option = nonceFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.nonceFormat || 'raw')) {
					option.selected = true;
				}
			});

			const nonceLengthContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const nonceLengthLabel = nonceLengthContainer.createEl('label', {
				text: 'Nonce长度:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const nonceLengthSelector = nonceLengthContainer.createEl('select', {
				cls: 'codec-nonce-length-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			[12, 16].forEach(length => {
				const option = nonceLengthSelector.createEl('option', { value: String(length), text: `${length}字节` });
				if (length === (decryptConfig.nonceLength || 12)) {
					option.selected = true;
				}
			});

			const inputContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const inputLabel = inputContainer.createEl('label', {
				text: '输入格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const inputSelector = inputContainer.createEl('select', {
				cls: 'codec-input-selector',
				attr: { style: 'font-size: 11px; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'base64', 'raw'].forEach(format => {
				const option = inputSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === (decryptConfig.inputFormat || 'hex')) {
					option.selected = true;
				}
			});

			keyInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, key: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			keyFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, keyFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonce: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceFormatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonceFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			nonceLengthSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, nonceLength: parseInt(target.value) as 12 | 16 };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});

			inputSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const currentConfig = chainItem.getAttribute('data-config');
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, inputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['timestamp-to-date'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentFormat = config.format as string || 'iso';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const formatSelector = formatContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['iso', 'locale', 'custom'].forEach(format => {
				const option = formatSelector.createEl('option', { value: format, text: format === 'iso' ? 'ISO 8601 格式' : format === 'locale' ? '本地日期时间' : '自定义格式' });
				if (format === currentFormat) {
					option.selected = true;
				}
			});

			const customFormatContainer = configContainer.createEl('div', {
				attr: { style: `display: ${currentFormat === 'custom' ? 'flex' : 'none'}; flex-direction: column; gap: 2px;` }
			});

			const customFormatLabel = customFormatContainer.createEl('label', {
				text: '自定义格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const customFormatInput = customFormatContainer.createEl('input', {
				type: 'text',
				cls: 'codec-custom-format-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: 'YYYY-MM-DD HH:mm:ss',
					value: config.customFormat as string || 'YYYY-MM-DD HH:mm:ss'
				}
			});

			const hint = customFormatContainer.createEl('div', {
				text: '支持占位符：YYYY(年份) MM(月份) DD(日期) HH(小时) mm(分钟) ss(秒) SSS(毫秒)',
				attr: { style: 'font-size: 10px; color: var(--text-muted);' }
			});

			formatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, format: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
				
				customFormatContainer.style.display = target.value === 'custom' ? 'flex' : 'none';
			});

			customFormatInput.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				const newConfig = { ...parsedConfig, customFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		if (['date-to-timestamp'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentFormat = config.outputFormat as string || 'milliseconds';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const formatSelector = formatContainer.createEl('select', {
				cls: 'codec-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['milliseconds', 'seconds'].forEach(format => {
				const option = formatSelector.createEl('option', { value: format, text: format === 'milliseconds' ? '毫秒 (13位)' : '秒 (10位)' });
				if (format === currentFormat) {
					option.selected = true;
				}
			});

			const hint = configContainer.createEl('div', {
				text: '支持格式：ISO 8601 (2024-01-15T12:30:45) | 中文日期 (2024年1月15日) | 时间戳',
				attr: { style: 'font-size: 10px; color: var(--text-muted);' }
			});

			formatSelector.addEventListener('change', (e) => {
				const target = e.target as HTMLSelectElement;
				const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
				const newConfig = { ...existingConfig, outputFormat: target.value };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			});
		}

		// 为JWT签名操作添加配置UI
		if (['jwt-sign'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentAlgorithm = config.algorithm as string || 'HS256';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 算法选择容器
			const algorithmContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const algorithmLabel = algorithmContainer.createEl('label', {
				text: '签名算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const algorithmSelector = algorithmContainer.createEl('select', {
				cls: 'codec-algorithm-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			const algorithms = [
				{ value: 'ES256', text: 'ES256' },
				{ value: 'ES384', text: 'ES384' },
				{ value: 'ES512', text: 'ES512' },
				{ value: 'HS256', text: 'HS256' },
				{ value: 'HS384', text: 'HS384' },
				{ value: 'HS512', text: 'HS512' },
				{ value: 'PS256', text: 'PS256' },
				{ value: 'PS384', text: 'PS384' },
				{ value: 'PS512', text: 'PS512' },
				{ value: 'RS256', text: 'RS256' },
				{ value: 'RS384', text: 'RS384' },
				{ value: 'RS512', text: 'RS512' },
				{ value: 'None', text: 'None' }
			];

			algorithms.forEach(algo => {
				const option = algorithmSelector.createEl('option', { value: algo.value, text: algo.text });
				if (algo.value === currentAlgorithm) {
					option.selected = true;
				}
			});

			// 密钥输入容器
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: 'JWT 密钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInput = keyContainer.createEl('input', {
				type: 'text',
				cls: 'codec-jwt-key-input',
				attr: {
					style: 'width: 100%; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入 JWT 密钥'
				}
			});
			keyInput.value = config.secretKey as string || '';

			// Base64 编码勾选框
			const base64CheckboxContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; align-items: center; gap: 6px;' }
			});

			const base64Checkbox = base64CheckboxContainer.createEl('input', {
				type: 'checkbox',
				attr: {
					style: 'cursor: pointer; width: 14px; height: 14px;'
				}
			});

			const base64CheckboxLabel = base64CheckboxContainer.createEl('label', {
				text: 'Base64 编码',
				attr: { style: 'font-size: 11px; color: var(--text-muted); cursor: pointer;' }
			});

			base64Checkbox.checked = Boolean(config.base64Encoded);

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					algorithm: algorithmSelector.value,
					secretKey: keyInput.value,
					base64Encoded: base64Checkbox.checked
				}));
			};

			algorithmSelector.addEventListener('change', updateConfig);
			keyInput.addEventListener('input', updateConfig);
			base64Checkbox.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为文件哈希操作添加配置UI
		if (['file-hash'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentAlgorithm = config.algorithm as string || 'md5';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 算法选择容器
			const algorithmContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const algorithmLabel = algorithmContainer.createEl('label', {
				text: '哈希算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const algorithmSelector = algorithmContainer.createEl('select', {
				cls: 'codec-hash-algorithm-selector',
				attr: {
					style: 'width: 100%; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);'
				}
			});

			// 添加算法选项
			const algorithms = [
				{ value: 'md5', label: 'MD5' },
				{ value: 'sha-1', label: 'SHA-1' },
				{ value: 'sha-256', label: 'SHA-256' },
				{ value: 'sha-512', label: 'SHA-512' },
				{ value: 'sm3', label: 'SM3' }
			];

			algorithms.forEach(algo => {
				const option = algorithmSelector.createEl('option', {
					value: algo.value,
					text: algo.label
				});
				if (algo.value === currentAlgorithm) {
					option.selected = true;
				}
			});

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					algorithm: algorithmSelector.value
				}));
			};

			algorithmSelector.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为 CMAC 操作添加配置 UI
		if (['cmac'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentKey = config.key as string || '';
			const currentKeyFormat = config.keyFormat as string || 'raw';
			const currentAlgorithm = config.algorithm as string || 'AES';
			const currentOutputFormat = config.outputFormat as string || 'hex';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 密钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInput = keyContainer.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'width: 100%; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});
			keyInput.value = currentKey;

			// 密钥格式选择
			const keyFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyFormatLabel = keyFormatContainer.createEl('label', {
				text: '密钥格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyFormatSelector = keyFormatContainer.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentKeyFormat) {
					option.selected = true;
				}
			});

			// 加密算法选择
			const algorithmContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const algorithmLabel = algorithmContainer.createEl('label', {
				text: '加密算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const algorithmSelector = algorithmContainer.createEl('select', {
				cls: 'codec-algorithm-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['AES', 'DES', '3DES', 'SM4'].forEach(algo => {
				const option = algorithmSelector.createEl('option', { value: algo, text: algo });
				if (algo === currentAlgorithm) {
					option.selected = true;
				}
			});

			// 输出格式选择
			const outputFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputFormatLabel = outputFormatContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputFormatSelector = outputFormatContainer.createEl('select', {
				cls: 'codec-output-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = outputFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentOutputFormat) {
					option.selected = true;
				}
			});

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					key: keyInput.value,
					keyFormat: keyFormatSelector.value,
					algorithm: algorithmSelector.value,
					outputFormat: outputFormatSelector.value
				}));
			};

			keyInput.addEventListener('input', updateConfig);
			keyFormatSelector.addEventListener('change', updateConfig);
			algorithmSelector.addEventListener('change', updateConfig);
			outputFormatSelector.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为 HMAC 操作添加配置 UI
		if (['hmac'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentKey = config.key as string || '';
			const currentKeyFormat = config.keyFormat as string || 'raw';
			const currentHashMethod = config.hashMethod as string || 'SHA-256';
			const currentOutputFormat = config.outputFormat as string || 'hex';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 密钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInput = keyContainer.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'width: 100%; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});
			keyInput.value = currentKey;

			// 密钥格式选择
			const keyFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyFormatLabel = keyFormatContainer.createEl('label', {
				text: '密钥格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyFormatSelector = keyFormatContainer.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentKeyFormat) {
					option.selected = true;
				}
			});

			// 哈希方法选择
			const hashMethodContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const hashMethodLabel = hashMethodContainer.createEl('label', {
				text: '哈希方法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const hashMethodSelector = hashMethodContainer.createEl('select', {
				cls: 'codec-hash-method-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['SHA-1', 'SHA-256', 'SHA-512', 'MD5', 'SM3'].forEach(method => {
				const option = hashMethodSelector.createEl('option', { value: method, text: method });
				if (method === currentHashMethod) {
					option.selected = true;
				}
			});

			// 输出格式选择
			const outputFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputFormatLabel = outputFormatContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputFormatSelector = outputFormatContainer.createEl('select', {
				cls: 'codec-output-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = outputFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentOutputFormat) {
					option.selected = true;
				}
			});

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					key: keyInput.value,
					keyFormat: keyFormatSelector.value,
					hashMethod: hashMethodSelector.value,
					outputFormat: outputFormatSelector.value
				}));
			};

			keyInput.addEventListener('input', updateConfig);
			keyFormatSelector.addEventListener('change', updateConfig);
			hashMethodSelector.addEventListener('change', updateConfig);
			outputFormatSelector.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为 CBC-MAC 操作添加配置 UI
		if (['cbc-mac'].includes(operation.id)) {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentKey = config.key as string || '';
			const currentKeyFormat = config.keyFormat as string || 'raw';
			const currentAlgorithm = config.algorithm as string || 'AES';
			const currentOutputFormat = config.outputFormat as string || 'hex';
			const currentPadding = config.padding as string || 'pkcs';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 密钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '密钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyInput = keyContainer.createEl('input', {
				type: 'text',
				cls: 'codec-key-input',
				attr: {
					style: 'width: 100%; font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入密钥'
				}
			});
			keyInput.value = currentKey;

			// 密钥格式选择
			const keyFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyFormatLabel = keyFormatContainer.createEl('label', {
				text: '密钥格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyFormatSelector = keyFormatContainer.createEl('select', {
				cls: 'codec-key-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = keyFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentKeyFormat) {
					option.selected = true;
				}
			});

			// 加密算法选择
			const algorithmContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const algorithmLabel = algorithmContainer.createEl('label', {
				text: '加密算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const algorithmSelector = algorithmContainer.createEl('select', {
				cls: 'codec-algorithm-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['AES', 'DES', 'SM4'].forEach(algo => {
				const option = algorithmSelector.createEl('option', { value: algo, text: algo });
				if (algo === currentAlgorithm) {
					option.selected = true;
				}
			});

			// 输出格式选择
			const outputFormatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const outputFormatLabel = outputFormatContainer.createEl('label', {
				text: '输出格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const outputFormatSelector = outputFormatContainer.createEl('select', {
				cls: 'codec-output-format-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['hex', 'raw', 'base64'].forEach(format => {
				const option = outputFormatSelector.createEl('option', { value: format, text: format.toUpperCase() });
				if (format === currentOutputFormat) {
					option.selected = true;
				}
			});

			// 填充方式选择
			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充方式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingSelector = paddingContainer.createEl('select', {
				cls: 'codec-padding-selector',
				attr: { style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);' }
			});

			['pkcs', 'zeroPadding'].forEach(padding => {
				const option = paddingSelector.createEl('option', { value: padding, text: padding });
				if (padding === currentPadding) {
					option.selected = true;
				}
			});

			const updateConfig = () => {
				const existingConfig = chainItem.getAttribute('data-config');
				const parsedConfig = existingConfig ? JSON.parse(existingConfig) : {};
				chainItem.setAttribute('data-config', JSON.stringify({
					...parsedConfig,
					key: keyInput.value,
					keyFormat: keyFormatSelector.value,
					algorithm: algorithmSelector.value,
					outputFormat: outputFormatSelector.value,
					padding: paddingSelector.value
				}));
			};

			keyInput.addEventListener('input', updateConfig);
			keyFormatSelector.addEventListener('change', updateConfig);
			algorithmSelector.addEventListener('change', updateConfig);
			outputFormatSelector.addEventListener('change', updateConfig);
			paddingSelector.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为随机数生成操作添加配置 UI
		if (operation.id === 'random-number') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentLength = config.length as number || 16;
			const currentUnit = config.unit as string || 'byte';
			const currentFormat = config.format as string || 'hex';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 随机数长度配置
			const lengthContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const lengthLabel = lengthContainer.createEl('label', {
				text: '随机数长度:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const lengthInput = lengthContainer.createEl('input', {
				type: 'number',
				cls: 'random-length-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					min: '1',
					max: '10000',
					value: currentLength.toString()
				}
			});

			// 单位配置
			const unitContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const unitLabel = unitContainer.createEl('label', {
				text: '单位:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const unitContainer2 = unitContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const bitRadio = unitContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const bitRadioInput = bitRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-unit',
					value: 'bit',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentUnit === 'bit') {
				bitRadioInput.checked = true;
			}
			bitRadio.createSpan({ text: '位' });

			const charRadio = unitContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const charRadioInput = charRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-unit',
					value: 'char',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentUnit === 'char') {
				charRadioInput.checked = true;
			}
			charRadio.createSpan({ text: '字符' });

			const byteRadio = unitContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const byteRadioInput = byteRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-unit',
					value: 'byte',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentUnit === 'byte') {
				byteRadioInput.checked = true;
			}
			byteRadio.createSpan({ text: '字节' });

			// 生成格式配置
			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '生成格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const formatContainer2 = formatContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const hexRadio = formatContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const hexRadioInput = hexRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-format',
					value: 'hex',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentFormat === 'hex') {
				hexRadioInput.checked = true;
			}
			hexRadio.createSpan({ text: 'HEX' });

			const base64Radio = formatContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const base64RadioInput = base64Radio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-format',
					value: 'base64',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentFormat === 'base64') {
				base64RadioInput.checked = true;
			}
			base64Radio.createSpan({ text: 'Base64' });

			const rawRadio = formatContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const rawRadioInput = rawRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'random-format',
					value: 'raw',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentFormat === 'raw') {
				rawRadioInput.checked = true;
			}
			rawRadio.createSpan({ text: 'RAW' });

			// 配置更新函数
			const updateConfig = () => {
				const length = parseInt(lengthInput.value) || 16;
				
				let unit = 'byte';
				const unitInput = unitContainer2.querySelector('input[name="random-unit"]:checked') as HTMLInputElement;
				if (unitInput) {
					unit = unitInput.value;
				}

				let format = 'hex';
				const formatInput = formatContainer2.querySelector('input[name="random-format"]:checked') as HTMLInputElement;
				if (formatInput) {
					format = formatInput.value;
				}

				const newConfig = { ...config, length, unit, format };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			lengthInput.addEventListener('input', updateConfig);
			unitContainer2.addEventListener('change', updateConfig);
			formatContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为时间戳生成操作添加配置 UI
		if (operation.id === 'timestamp-generate') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentUnit = config.unit as string || 'ms';
			const currentTimezone = config.timezone as string || 'Asia/Shanghai';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 单位配置
			const unitContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const unitLabel = unitContainer.createEl('label', {
				text: '单位:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const unitContainer2 = unitContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const msRadio = unitContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const msRadioInput = msRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'timestamp-unit',
					value: 'ms',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentUnit === 'ms') {
				msRadioInput.checked = true;
			}
			msRadio.createSpan({ text: '毫秒(ms)' });

			const sRadio = unitContainer2.createEl('label', {
				attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
			});
			const sRadioInput = sRadio.createEl('input', {
				attr: { 
					type: 'radio',
					name: 'timestamp-unit',
					value: 's',
					style: 'cursor: pointer;' 
				}
			}) as HTMLInputElement;
			if (currentUnit === 's') {
				sRadioInput.checked = true;
			}
			sRadio.createSpan({ text: '秒(s)' });

			// 时区配置
			const timezoneContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const timezoneLabel = timezoneContainer.createEl('label', {
				text: '时区:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const timezoneContainer2 = timezoneContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 4px; font-size: 11px;' }
			});

			const timezones = [
				{ value: 'Asia/Shanghai', text: '北京时间 (UTC+8)' },
				{ value: 'Asia/Hong_Kong', text: '香港时间 (UTC+8)' },
				{ value: 'Asia/Taipei', text: '台北时间 (UTC+8)' },
				{ value: 'Asia/Tokyo', text: '东京时间 (UTC+9)' },
				{ value: 'Asia/Seoul', text: '首尔时间 (UTC+9)' },
				{ value: 'Asia/Singapore', text: '新加坡时间 (UTC+8)' },
				{ value: 'Asia/Dubai', text: '迪拜时间 (UTC+4)' },
				{ value: 'Europe/London', text: '伦敦时间 (UTC+0/BST)' },
				{ value: 'Europe/Paris', text: '巴黎时间 (UTC+1/CEST)' },
				{ value: 'Europe/Berlin', text: '柏林时间 (UTC+1/CEST)' },
				{ value: 'Europe/Moscow', text: '莫斯科时间 (UTC+3)' },
				{ value: 'America/New_York', text: '纽约时间 (UTC-5/EDT)' },
				{ value: 'America/Los_Angeles', text: '洛杉矶时间 (UTC-8/PDT)' },
				{ value: 'America/Chicago', text: '芝加哥时间 (UTC-6/CDT)' },
				{ value: 'America/Toronto', text: '多伦多时间 (UTC-5/EDT)' },
				{ value: 'America/Sao_Paulo', text: '圣保罗时间 (UTC-3)' },
				{ value: 'Australia/Sydney', text: '悉尼时间 (UTC+10/AEDT)' },
				{ value: 'Australia/Melbourne', text: '墨尔本时间 (UTC+10/AEDT)' },
				{ value: 'Pacific/Auckland', text: '奥克兰时间 (UTC+12/NZDT)' },
				{ value: 'UTC', text: 'UTC 协调世界时' }
			];

			timezones.forEach(tz => {
				const tzOption = timezoneContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const tzRadioInput = tzOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'timestamp-timezone',
						value: tz.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (tz.value === currentTimezone) {
					tzRadioInput.checked = true;
				}
				tzOption.createSpan({ text: tz.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let unit = 'ms';
				const unitInput = unitContainer2.querySelector('input[name="timestamp-unit"]:checked') as HTMLInputElement;
				if (unitInput) {
					unit = unitInput.value;
				}

				let timezone = 'Asia/Shanghai';
				const timezoneInput = timezoneContainer2.querySelector('input[name="timestamp-timezone"]:checked') as HTMLInputElement;
				if (timezoneInput) {
					timezone = timezoneInput.value;
				}

				const newConfig = { ...config, unit, timezone };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			unitContainer2.addEventListener('change', updateConfig);
			timezoneContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为随机字符串生成操作添加配置 UI
		if (operation.id === 'random-string') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentMinLength = config.minLength as number || 8;
			const currentMaxLength = config.maxLength as number || 16;
			const currentCharset = config.charset as string || '';
			const currentCount = config.count as number || 10;

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 长度范围配置
			const lengthContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const lengthLabel = lengthContainer.createEl('label', {
				text: '长度范围:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const lengthInputsContainer = lengthContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 8px; align-items: center;' }
			});

			const minLengthInput = lengthInputsContainer.createEl('input', {
				type: 'number',
				cls: 'min-length-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); width: 80px;',
					min: '1',
					max: '1000',
					value: currentMinLength.toString()
				}
			});

			lengthInputsContainer.createSpan({ text: '-' });

			const maxLengthInput = lengthInputsContainer.createEl('input', {
				type: 'number',
				cls: 'max-length-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); width: 80px;',
					min: '1',
					max: '1000',
					value: currentMaxLength.toString()
				}
			});

			// 字符集配置
			const charsetContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const charsetLabel = charsetContainer.createEl('label', {
				text: '字符集:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const charsetInput = charsetContainer.createEl('input', {
				type: 'text',
				cls: 'charset-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					placeholder: '输入允许的字符集'
				}
			});
			charsetInput.value = currentCharset;

			// 快速选择配置
			const quickSelectContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const quickSelectLabel = quickSelectContainer.createEl('label', {
				text: '快速选择:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const checkboxContainer = quickSelectContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px; flex-wrap: wrap;' }
			});

			const predefinedCharsets = [
				{ key: 'digits', label: '数字', charset: '0123456789' },
				{ key: 'lowercase', label: '小写字母', charset: 'abcdefghijklmnopqrstuvwxyz' },
				{ key: 'uppercase', label: '大写字母', charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
				{ key: 'symbols', label: '常用符号', charset: '~!@#$%^&*()_+' }
			];

			predefinedCharsets.forEach(item => {
				const checkboxOption = checkboxContainer.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const checkbox = checkboxOption.createEl('input', {
					attr: { 
						type: 'checkbox',
						class: 'charset-checkbox',
						'data-charset': item.charset,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				checkboxOption.createSpan({ text: item.label });
			});

			// 生成数量配置
			const countContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const countLabel = countContainer.createEl('label', {
				text: '生成数量:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const countInput = countContainer.createEl('input', {
				type: 'number',
				cls: 'count-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal);',
					min: '1',
					max: '1000',
					value: currentCount.toString()
				}
			});

			// 配置更新函数
			const updateConfig = () => {
				const minLength = parseInt(minLengthInput.value) || 8;
				const maxLength = parseInt(maxLengthInput.value) || 16;
				const charset = charsetInput.value || '';
				const count = parseInt(countInput.value) || 10;

				const newConfig = { ...config, minLength, maxLength, charset, count };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			// 字符集选择框事件
			checkboxContainer.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target.classList.contains('charset-checkbox')) {
					const charset = target.getAttribute('data-charset');
					if (charset) {
						if (target.checked) {
							// 添加到字符集（去重）
							const currentCharset = charsetInput.value || '';
							const combinedCharset = currentCharset + charset;
							charsetInput.value = [...new Set(combinedCharset.split(''))].join('');
						} else {
							// 从字符集中移除
							const currentCharset = charsetInput.value || '';
							const newCharset = currentCharset.split('').filter(char => !charset.includes(char)).join('');
							charsetInput.value = newCharset;
						}
						updateConfig();
					}
				}
			});

			// 其他输入事件
			minLengthInput.addEventListener('input', updateConfig);
			maxLengthInput.addEventListener('input', updateConfig);
			charsetInput.addEventListener('input', updateConfig);
			countInput.addEventListener('input', updateConfig);
			updateConfig();
		}

		// 为RSA加密操作添加配置UI
		if (operation.id === 'rsa-encrypt') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentPublicKey = config.publicKey as string || '';
			const currentPadding = config.padding as string || 'RSA-OAEP';
			const currentHash = config.hashAlgorithm as string || 'SHA-256';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 公钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '公钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyTextarea = keyContainer.createEl('textarea', {
				cls: 'rsa-public-key-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); min-height: 60px; resize: vertical;',
					placeholder: '输入PEM格式的RSA公钥'
				}
			});
			keyTextarea.value = currentPublicKey;

			// 填充方式
			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充方式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingContainer2 = paddingContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const paddings = [
				{ value: 'RSA-OAEP', text: 'RSA-OAEP' },
				{ value: 'PKCS1v15', text: 'PKCS1v15' },
				{ value: 'JSEncrypt', text: 'JSEncrypt' }
			];

			paddings.forEach(padding => {
				const paddingOption = paddingContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const paddingRadioInput = paddingOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'rsa-padding',
						value: padding.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (padding.value === currentPadding) {
					paddingRadioInput.checked = true;
				}
				paddingOption.createSpan({ text: padding.text });
			});

			// Hash算法
			const hashContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const hashLabel = hashContainer.createEl('label', {
				text: 'Hash算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const hashContainer2 = hashContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const hashAlgorithms = [
				{ value: 'SHA-1', text: 'SHA-1' },
				{ value: 'SHA-256', text: 'SHA-256' },
				{ value: 'SHA-384', text: 'SHA-384' },
				{ value: 'SHA-512', text: 'SHA-512' },
				{ value: 'MD5', text: 'MD5' }
			];

			hashAlgorithms.forEach(hash => {
				const hashOption = hashContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const hashRadioInput = hashOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'rsa-hash',
						value: hash.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (hash.value === currentHash) {
					hashRadioInput.checked = true;
				}
				hashOption.createSpan({ text: hash.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let padding = 'RSA-OAEP';
				const paddingInput = paddingContainer2.querySelector('input[name="rsa-padding"]:checked') as HTMLInputElement;
				if (paddingInput) {
					padding = paddingInput.value;
				}

				let hashAlgorithm = 'SHA-256';
				const hashInput = hashContainer2.querySelector('input[name="rsa-hash"]:checked') as HTMLInputElement;
				if (hashInput) {
					hashAlgorithm = hashInput.value;
				}

				const publicKey = keyTextarea.value || '';

				const newConfig = { ...config, publicKey, padding, hashAlgorithm };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			keyTextarea.addEventListener('input', updateConfig);
			paddingContainer2.addEventListener('change', updateConfig);
			hashContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为SM2加密操作添加配置UI
		if (operation.id === 'sm2-encrypt') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentPublicKey = config.publicKey as string || '';
			const currentFormat = config.format as string || 'C1C3C2';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 公钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '公钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyTextarea = keyContainer.createEl('textarea', {
				cls: 'sm2-public-key-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); min-height: 60px; resize: vertical;',
					placeholder: '输入SM2公钥（04开头格式）'
				}
			});
			keyTextarea.value = currentPublicKey;

			// 编码格式
			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '编码格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const formatContainer2 = formatContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const formats = [
				{ value: 'ASN1', text: 'ASN1' },
				{ value: 'C1C2C3', text: 'C1C2C3' },
				{ value: 'C1C3C2', text: 'C1C3C2' }
			];

			formats.forEach(format => {
				const formatOption = formatContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const formatRadioInput = formatOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'sm2-format',
						value: format.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (format.value === currentFormat) {
					formatRadioInput.checked = true;
				}
				formatOption.createSpan({ text: format.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let format = 'C1C3C2';
				const formatInput = formatContainer2.querySelector('input[name="sm2-format"]:checked') as HTMLInputElement;
				if (formatInput) {
					format = formatInput.value;
				}

				const publicKey = keyTextarea.value || '';

				const newConfig = { ...config, publicKey, format };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			keyTextarea.addEventListener('input', updateConfig);
			formatContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为RSA解密操作添加配置UI
		if (operation.id === 'rsa-decrypt') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentPrivateKey = config.privateKey as string || '';
			const currentPadding = config.padding as string || 'RSA-OAEP';
			const currentHash = config.hashAlgorithm as string || 'SHA-256';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 私钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '私钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyTextarea = keyContainer.createEl('textarea', {
				cls: 'rsa-private-key-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); min-height: 60px; resize: vertical;',
					placeholder: '输入PEM格式的RSA私钥'
				}
			});
			keyTextarea.value = currentPrivateKey;

			// 填充方式
			const paddingContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const paddingLabel = paddingContainer.createEl('label', {
				text: '填充方式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const paddingContainer2 = paddingContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const paddings = [
				{ value: 'RSA-OAEP', text: 'RSA-OAEP' },
				{ value: 'PKCS1v15', text: 'PKCS1v15' },
				{ value: 'JSEncrypt', text: 'JSEncrypt' }
			];

			paddings.forEach(padding => {
				const paddingOption = paddingContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const paddingRadioInput = paddingOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'rsa-decrypt-padding',
						value: padding.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (padding.value === currentPadding) {
					paddingRadioInput.checked = true;
				}
				paddingOption.createSpan({ text: padding.text });
			});

			// Hash算法
			const hashContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const hashLabel = hashContainer.createEl('label', {
				text: 'Hash算法:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const hashContainer2 = hashContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const hashAlgorithms = [
				{ value: 'SHA-1', text: 'SHA-1' },
				{ value: 'SHA-256', text: 'SHA-256' },
				{ value: 'SHA-384', text: 'SHA-384' },
				{ value: 'SHA-512', text: 'SHA-512' },
				{ value: 'MD5', text: 'MD5' }
			];

			hashAlgorithms.forEach(hash => {
				const hashOption = hashContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const hashRadioInput = hashOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'rsa-decrypt-hash',
						value: hash.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (hash.value === currentHash) {
					hashRadioInput.checked = true;
				}
				hashOption.createSpan({ text: hash.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let padding = 'RSA-OAEP';
				const paddingInput = paddingContainer2.querySelector('input[name="rsa-decrypt-padding"]:checked') as HTMLInputElement;
				if (paddingInput) {
					padding = paddingInput.value;
				}

				let hashAlgorithm = 'SHA-256';
				const hashInput = hashContainer2.querySelector('input[name="rsa-decrypt-hash"]:checked') as HTMLInputElement;
				if (hashInput) {
					hashAlgorithm = hashInput.value;
				}

				const privateKey = keyTextarea.value || '';

				const newConfig = { ...config, privateKey, padding, hashAlgorithm };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			keyTextarea.addEventListener('input', updateConfig);
			paddingContainer2.addEventListener('change', updateConfig);
			hashContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 为SM2解密操作添加配置UI
		if (operation.id === 'sm2-decrypt') {
			const currentConfig = chainItem.getAttribute('data-config');
			const config = currentConfig ? JSON.parse(currentConfig) : {};
			const currentPrivateKey = config.privateKey as string || '';
			const currentFormat = config.format as string || 'C1C3C2';

			const configContainer = info.createEl('div', {
				attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
			});

			// 私钥输入
			const keyContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const keyLabel = keyContainer.createEl('label', {
				text: '私钥:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const keyTextarea = keyContainer.createEl('textarea', {
				cls: 'sm2-private-key-input',
				attr: {
					style: 'font-size: 11px; padding: 4px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-secondary); color: var(--text-normal); min-height: 60px; resize: vertical;',
					placeholder: '输入SM2私钥'
				}
			});
			keyTextarea.value = currentPrivateKey;

			// 编码格式
			const formatContainer = configContainer.createEl('div', {
				attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
			});

			const formatLabel = formatContainer.createEl('label', {
				text: '编码格式:',
				attr: { style: 'font-size: 11px; color: var(--text-muted);' }
			});

			const formatContainer2 = formatContainer.createEl('div', {
				attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
			});

			const formats = [
				{ value: 'ASN1', text: 'ASN1' },
				{ value: 'C1C2C3', text: 'C1C2C3' },
				{ value: 'C1C3C2', text: 'C1C3C2' }
			];

			formats.forEach(format => {
				const formatOption = formatContainer2.createEl('label', {
					attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
				});
				const formatRadioInput = formatOption.createEl('input', {
					attr: { 
						type: 'radio',
						name: 'sm2-decrypt-format',
						value: format.value,
						style: 'cursor: pointer;' 
					}
				}) as HTMLInputElement;
				if (format.value === currentFormat) {
					formatRadioInput.checked = true;
				}
				formatOption.createSpan({ text: format.text });
			});

			// 配置更新函数
			const updateConfig = () => {
				let format = 'C1C3C2';
				const formatInput = formatContainer2.querySelector('input[name="sm2-decrypt-format"]:checked') as HTMLInputElement;
				if (formatInput) {
					format = formatInput.value;
				}

				const privateKey = keyTextarea.value || '';

				const newConfig = { ...config, privateKey, format };
				chainItem.setAttribute('data-config', JSON.stringify(newConfig));
			};

			keyTextarea.addEventListener('input', updateConfig);
			formatContainer2.addEventListener('change', updateConfig);
			updateConfig();
		}

		// 创建控制按钮容器
		const buttonsContainer = content.createEl('div', {
			cls: 'state-control-buttons',
			attr: { style: 'display: flex; gap: 8px; align-items: center;' }
		});

		// 创建禁用按钮
		const disabledButton = buttonsContainer.createEl('button', {
			cls: 'state-control-button codec-disabled-btn'
		});
		setIcon(disabledButton, 'power-off');
		disabledButton.addEventListener('click', (e) => {
			e.stopPropagation();
			controller.toggleDisabled();
		});

		// 创建断点按钮
		const breakpointButton = buttonsContainer.createEl('button', {
			cls: 'state-control-button codec-breakpoint-btn'
		});
		setIcon(breakpointButton, 'alert-triangle');
		breakpointButton.addEventListener('click', (e) => {
			e.stopPropagation();
			controller.toggleBreakpoint();
			
			// 更新断点效果
			if (this.chainStateManager) {
				this.chainStateManager.updateBreakpointEffects();
			}
		});

		// 设置按钮引用
		controller.setButtons(disabledButton, breakpointButton);

		// 创建���除按钮
		const removeButton = buttonsContainer.createEl('button', {
			cls: 'codec-remove-operation',
			attr: { 'aria-label': '移除操作' }
		});
		removeButton.innerHTML = '&times;';
		removeButton.addEventListener('click', () => {
			chainItem.remove();
			this.itemControllers.delete(operation.id);
			this.checkChainEmpty(chainContainer);
			
			// 更新断点效果
			if (this.chainStateManager) {
				this.chainStateManager.updateBreakpointEffects();
			}
			
			// 检查立即执行
			this.checkImmediateExecution();
		});

		// 初始化状态管理器
		if (!this.chainStateManager) {
			this.chainStateManager = new ChainStateManager(chainContainer);
		}
		this.chainStateManager.registerItem(operation.id, controller);

		// 动画效果
		chainItem.style.opacity = '0';
		chainItem.style.transform = 'translateY(-10px)';
		
		requestAnimationFrame(() => {
			chainItem.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
			chainItem.style.opacity = '1';
			chainItem.style.transform = 'translateY(0)';
		});

		// 添加拖拽功能
		this.setupDragSorting(chainItem, operation.id);
		
		// 检查立即执行
		this.checkImmediateExecution();
	}

	/**
	 * 设置操作链项的拖拽排序功能
	 */
	private setupDragSorting(chainItem: HTMLElement, operationId: string): void {
		chainItem.draggable = true;

		chainItem.addEventListener('dragstart', (e) => {
			e.dataTransfer!.effectAllowed = 'move';
			e.dataTransfer!.setData('text/plain', operationId);
			
			// 记录被拖拽项的原始位置
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			const originalIndex = allItems.indexOf(chainItem);
			e.dataTransfer!.setData('original-index', originalIndex.toString());
			
			// 添加拖拽样式
			chainItem.addClass('codec-dragging');
			chainItem.addClass('dragging');
		});

		chainItem.addEventListener('dragend', () => {
			// 移除所有拖拽相关样式
			chainItem.removeClass('codec-dragging');
			chainItem.removeClass('dragging');
			
			// 清理所有拖拽样式
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = chainContainer.querySelectorAll('.codec-chain-item');
			allItems.forEach(item => {
				item.removeClass('drag-over');
				item.removeClass('codec-dragging');
			});
		});

		chainItem.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			e.dataTransfer!.dropEffect = 'move';
			
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			const targetIndex = allItems.indexOf(chainItem);
			const draggedIndex = parseInt(e.dataTransfer!.getData('original-index') || '0');
			
			if (targetIndex !== draggedIndex) {
				// 移除其他项的拖拽悬停样式
				allItems.forEach(item => item.removeClass('drag-over'));
				chainItem.addClass('drag-over');
			}
		});

		chainItem.addEventListener('dragleave', (e) => {
			// 检查是否真正离开了元素
			const rect = chainItem.getBoundingClientRect();
			const x = e.clientX;
			const y = e.clientY;
			
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
				chainItem.removeClass('drag-over');
			}
		});

		chainItem.addEventListener('drop', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			
			const draggedOperationId = e.dataTransfer!.getData('text/plain');
			const originalIndex = parseInt(e.dataTransfer!.getData('original-index') || '0');
			const targetIndex = allItems.indexOf(chainItem);
			
			if (draggedOperationId === operationId || targetIndex === originalIndex) {
				return;
			}
			
			// 执行重新排序
			this.reorderChainItems(chainContainer, originalIndex, targetIndex);
			
			// 清理样式
			allItems.forEach(item => item.removeClass('drag-over'));
			
			// 检查立即执行
			this.checkImmediateExecution();
		});
	}

	/**
	 * 重新排序操作链项
	 */
	private reorderChainItems(container: HTMLElement, fromIndex: number, toIndex: number): void {
		const allItems = Array.from(container.querySelectorAll('.codec-chain-item'));
		
		if (fromIndex < 0 || fromIndex >= allItems.length || toIndex < 0 || toIndex >= allItems.length) {
			return;
		}
		
		const [movedItem] = allItems.splice(fromIndex, 1);
		if (!movedItem) {
			return;
		}
		allItems.splice(toIndex, 0, movedItem);
		
		// 重新插入DOM元素
		allItems.forEach((item, index) => {
			container.appendChild(item);
		});
		
		new Notice('操作顺序已调整');
	}

	private checkChainEmpty(container: HTMLElement): void {
		const items = container.querySelectorAll('.codec-chain-item');
		if (items.length === 0) {
			const placeholder = container.createEl('div', {
				cls: 'codec-chain-placeholder',
				attr: { 
					style: 'text-align: center; color: var(--text-muted); padding: 40px 20px;',
					'data-placeholder': 'true'
				},
				text: '拖拽操作到此区域构建操作链'
			});
		}
	}

	private async executeOperationChain(): Promise<void> {
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
		const outputArea = this.containerEl.querySelector('.codec-output-area') as HTMLTextAreaElement;

		const chainItems = chainContainer.querySelectorAll('.codec-chain-item');
		if (chainItems.length === 0) {
			outputArea.value = '请先添加操作到操作链';
			return;
		}

		const input = inputArea.value;
		if (!input) {
			outputArea.value = '请输入要处理的文本';
			return;
		}

		// 重置断点状态
		this.currentBreakpointIndex = -1;
		this.hideContinueButton();

		try {
			const { chainProcessor, globalRegistry } = this.plugin;
			const chainConfig = Array.from(chainItems).map(item => {
				const configStr = item.getAttribute('data-config');
				const config = configStr ? JSON.parse(configStr) : {};
				return {
					operationId: item.getAttribute('data-chain-operation-id') || '',
					config: config
				};
			});

			const result = await chainProcessor.executeChain(input, chainConfig, {
				onProgress: (current, total) => {
					// 不再访问result.breakpoint，直接显示进度
					outputArea.value = `正在执行第 ${current}/${total} 步...`;
				},
				onStepComplete: (step, stepResult) => {
					// 可以在这里添加步骤完成的视觉反馈
				},
				getRuntimeState: (index) => {
					const item = chainItems[index];
					if (!item) return undefined;
					
					const operationId = item.getAttribute('data-chain-operation-id');
					if (!operationId) return undefined;
					
					return this.chainStateManager?.getItemState(operationId);
				},
				onBreakpoint: (operationIndex) => {
					// 处理断点
					this.currentBreakpointIndex = operationIndex;
					this.showContinueButton();
					
					const item = chainItems[operationIndex];
					const operationId = item?.getAttribute('data-chain-operation-id');
					
					// 显示断点信息
					const operation = globalRegistry.get(operationId!);
					new Notice(`断点：在 "${operation?.name || operationId}" 处停止`);
				}
			});

			if (result.breakpoint) {
				// 在断点处停止，不更新输出
				const item = chainItems[this.currentBreakpointIndex];
				const operationId = item?.getAttribute('data-chain-operation-id');
				const operation = globalRegistry.get(operationId!);
				outputArea.value = `断点：已停止在 "${operation?.name || operationId}"\n\n当前结果：\n${result.data}`;
			} else if (result.success) {
				outputArea.value = result.data;
				new Notice('操作链执行完成');
			} else {
				outputArea.value = `执行失败: ${result.error}`;
			}
		} catch (error) {
			outputArea.value = `执行出错: ${error instanceof Error ? error.message : '未知错误'}`;
		}
	}

	private clearOperationChain(): void {
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		chainContainer.empty();
		
		// 清空控制器
		this.itemControllers.clear();
		
		// 重置断点状态
		this.currentBreakpointIndex = -1;
		this.hideContinueButton();
		
		const placeholder = chainContainer.createEl('div', {
			cls: 'codec-chain-placeholder',
			attr: { 
				style: 'text-align: center; color: var(--text-muted); padding: 40px 20px;',
				'data-placeholder': 'true'
			},
			text: '拖拽操作到此区域构建操作链'
		});
	}

	private saveOutputToFile(outputArea: HTMLTextAreaElement): void {
		const content = outputArea.value;
		if (!content) {
			new Notice('没有内容可保存');
			return;
		}

		// 创建文件保存对话框
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.txt,.md,.json';
		
		input.onchange = async (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			if (file) {
				try {
					// 创建Blob对象
					const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
					const url = URL.createObjectURL(blob);
					
					// 创建下载链接
					const a = document.createElement('a');
					a.href = url;
					a.download = file.name;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					
					new Notice(`已保存到: ${file.name}`);
				} catch (error) {
					new Notice('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
				}
			}
		};
		
		input.click();
	}

	private async importFileToInput(): Promise<void> {
		try {
			// 创建文件选择器
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.txt,.md,.json,.xml,.log,.csv,.html,.css,.js,.ts,.py,.java,.c,.cpp,.h,.go,.rs,.php,.sql,.sh,.bat,.text';
			
			input.onchange = async (event) => {
				const file = (event.target as HTMLInputElement).files?.[0];
				if (!file) return;
				
				try {
					// 读取文件内容
					const text = await file.text();
					
					// 写入输入框
					const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
					if (inputArea) {
						inputArea.value = text;
						inputArea.dispatchEvent(new Event('input', { bubbles: true }));
						
						// 显示成功提示
						new Notice(`已导入文件: ${file.name}`);
					}
				} catch (error) {
					new Notice(`文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
				}
			};
			
			input.click();
		} catch (error) {
			new Notice(`文件导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async selectFileAsInput(): Promise<void> {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '*'; // 支持所有文件类型
		
		input.onchange = async (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				let fileData: {
					name: string;
					type: string;
					size: number;
					data: string | ArrayBuffer;
					isFile: boolean;
					mimeType?: string;
				};
				
				try {
					if (file.type.startsWith('image/')) {
						// 图片文件：读取为ArrayBuffer
						const arrayBuffer = await file.arrayBuffer();
						
						if (!arrayBuffer || arrayBuffer.byteLength === 0) {
							throw new Error('图片文件读取为空');
						}
						
						console.log('图片文件读取成功，大小:', arrayBuffer.byteLength, '字节');
						
						fileData = {
							name: file.name,
							type: file.type,
							size: file.size,
							data: arrayBuffer,
							isFile: true,
							mimeType: file.type
						};
					} else {
						// 其他文件：读取为文本
						const textContent = await file.text();
						
						if (!textContent || textContent.length === 0) {
							throw new Error('文本文件读取为空');
						}
						
						console.log('文本文件读取成功，长度:', textContent.length, '字符');
						
						fileData = {
							name: file.name,
							type: file.type,
							size: file.size,
							data: textContent,
							isFile: true,
							mimeType: file.type
						};
					}
				} catch (readError) {
					throw new Error(`文件读取失败: ${readError instanceof Error ? readError.message : '未知错误'}`);
				}

				// 导入文件管理器
				const { FileManager } = await import('./file-manager.js');
				const fileManager = FileManager.getInstance();
				const fileId = fileManager.storeFile(fileData);
				const blobUrl = fileManager.getBlobUrl(fileId);

				// 验证文件是否正确存储
				const storedFile = fileManager.getFile(fileId);
				if (!storedFile) {
					throw new Error('文件存储失败');
				}

				// 验证Blob URL是否有效
				if (!blobUrl || !blobUrl.startsWith('blob:')) {
					throw new Error('Blob URL生成失败');
				}

				console.log('文件选择成功:', file.name, 'ID:', fileId, 'Blob URL:', blobUrl);

				// 在输入框显示文件链接
				const fileLink = `📄 ${file.name}
🔗 文件链接: ${blobUrl}
🆔 文件ID: ${fileId}

(文件已选中，可使用图片转Base64、读取EXIF等操作)`;
				
				// 将文件链接放入输入框
				const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
				if (inputArea) {
					inputArea.value = fileLink;
					inputArea.dispatchEvent(new Event('input', { bubbles: true }));
					new Notice(`已选中文件: ${file.name}`);
				}
			} catch (error) {
				new Notice(`文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`);
			}
		};

		input.click();
	}

	private bytesToHex(bytes: Uint8Array): string {
		return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	private bytesToText(bytes: Uint8Array, mimeType: string): string {
		// 根据MIME类型决定如何处理二进制数据
		if (mimeType.startsWith('text/') || mimeType.startsWith('application/json') || mimeType.startsWith('application/xml')) {
			// 文本类型：直接转换为字符串
			return new TextDecoder().decode(bytes);
		} else {
			// 二进制类型：转换为十六进制表示
			return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
		}
	}

	private calculateTextHash(text: string, algorithm: string): string {
		// 使用crypto-js计算文本哈希
		switch (algorithm) {
			case 'MD5':
				const MD5 = require('crypto-js/md5');
				return MD5(text).toString();
			case 'SHA256':
				const SHA256 = require('crypto-js/sha256');
				return SHA256(text).toString();
			case 'SHA512':
				const SHA512 = require('crypto-js/sha512');
				return SHA512(text).toString();
			default:
				return text; // 如果不支持的算法，返回原始文本
		}
	}

	private async calculateFileHashChunked(file: File): Promise<string> {
		const chunkSize = 1024 * 1024; // 1MB chunks
		const fileSize = file.size;
		const chunks = Math.ceil(fileSize / chunkSize);
		
		// 使用crypto-js的增量哈希功能
		const SHA256 = require('crypto-js/sha256');
		let hash = SHA256('');
		
		for (let i = 0; i < chunks; i++) {
			const start = i * chunkSize;
			const end = Math.min(start + chunkSize, fileSize);
			const chunk = file.slice(start, end);
			
			// 读取分块并更新哈希
			const arrayBuffer = await chunk.arrayBuffer();
			const wordArray = this.arrayBufferToWordArray(arrayBuffer);
			hash = SHA256(hash + wordArray);
		}
		
		return hash.toString();
	}

	private arrayBufferToWordArray(buffer: ArrayBuffer): any {
		const words = [];
		const bytes = new Uint8Array(buffer);
		for (let i = 0; i < bytes.length; i += 4) {
			words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
		}
		return words;
	}

	private shouldProcessAsLargeFile(file: File): boolean {
		const size = file.size;
		// 根据文件类型和大小决定处理策略
		if (file.type.startsWith('image/')) {
			return size > 5 * 1024 * 1024; // 图片大于5MB时使用分块处理
		}
		return size > 10 * 1024 * 1024; // 其他文件大于10MB时使用分块处理
	}

	private formatFileSize(bytes: number): string {
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	}

	applyFontConfig(): void {
		// 修复插件访问方式
		const plugin = (this.app as any).plugins?.plugins?.['obsidian-codec'];
		if (!plugin) return;
		
		const fontConfig = plugin?.getState?.()?.preferences?.fontConfig;
		
		if (!fontConfig) return;
		
		// 应用到输入框
		const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
		if (inputArea) {
			if (fontConfig.inputFontFamily) {
				inputArea.style.fontFamily = fontConfig.inputFontFamily;
			}
			if (fontConfig.inputFontSize) {
				inputArea.style.fontSize = fontConfig.inputFontSize;
			}
		}
		
		// 应用到输出框
		const outputArea = this.containerEl.querySelector('.codec-output-area') as HTMLTextAreaElement;
		if (outputArea) {
			if (fontConfig.outputFontFamily) {
				outputArea.style.fontFamily = fontConfig.outputFontFamily;
			}
			if (fontConfig.outputFontSize) {
				outputArea.style.fontSize = fontConfig.outputFontSize;
			}
		}
	}

	// 检查立即执行
	private checkImmediateExecution(): void {
		// 修复：使用DOM查询而不是访问不存在的属性
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const chainItems = chainContainer?.querySelectorAll('.codec-chain-item') || [];
		
		if (this.immediateExecutionCheckbox?.checked && chainItems.length > 0) {
			this.executeOperationChain();
		}
	}

	// 保存操作链模态对话框
	private showSaveChainModal(): void {
		new SaveChainModal(this.plugin.app, this).open();
	}

	// 显示历史记录下拉菜单
	private showChainHistory(): void {
		const historyButton = this.containerEl.querySelector('.codec-history-button') as HTMLElement;
		if (!historyButton) return;

		// 移除现有菜单
		const existingMenu = this.containerEl.querySelector('.codec-history-menu');
		if (existingMenu) {
			this.closeHistoryMenu();
			return;
		}
		this.closeHistoryMenu();

		const menu = historyButton.createEl('div', {
			cls: 'codec-history-menu',
			attr: { 
				style: 'position: absolute; top: 100%; right: 0; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: 0 4px 12px var(--background-modifier-border-hover); z-index: 1000; min-width: 200px; max-height: 300px; overflow-y: auto; margin-top: 8px;'
			}
		});

		const savedChains = this.plugin.data?.savedChains || [];
		if (savedChains.length === 0) {
			menu.createEl('div', {
				attr: { style: 'padding: 12px; text-align: center; color: var(--text-muted);' },
				text: '暂无保存的操作链'
			});
		} else {
			savedChains.forEach((chain: any) => {
				const item = menu.createEl('div', {
					cls: 'history-item',
					attr: { 
						style: 'padding: 12px; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; gap: 8px;'
					}
				});

				const itemInfo = item.createEl('div', {
					attr: { style: 'flex: 1; min-width: 0;' }
				});
				
				itemInfo.createEl('div', {
					text: chain.name,
					attr: { style: 'font-weight: 500; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }
				});
				
				itemInfo.createEl('div', {
					text: `${chain.operations.length}步 • ${new Date(chain.lastUsed).toLocaleTimeString()}`,
					attr: { style: 'font-size: 12px; color: var(--text-muted);' }
				});

				const actionContainer = item.createEl('div', {
					cls: 'history-item-actions',
					attr: { style: 'display: flex; gap: 4px; flex: 0 0 auto;' }
				});

				const editButton = actionContainer.createEl('button', {
					cls: 'toolbar-button history-edit-button',
					attr: {
						'aria-label': '重命名历史记录',
						'title': '重命名',
						'style': 'width: 24px; height: 24px; padding: 2px;'
					}
				});
				setIcon(editButton, 'pencil');

				const deleteButton = actionContainer.createEl('button', {
					cls: 'toolbar-button history-delete-button',
					attr: {
						'aria-label': '删除历史记录',
						'title': '删除',
						'style': 'width: 24px; height: 24px; padding: 2px; color: var(--text-error);'
					}
				});
				setIcon(deleteButton, 'trash-2');

				editButton.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					this.renameSavedChain(chain.id);
				});

				deleteButton.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					this.deleteSavedChain(chain.id);
				});

				item.addEventListener('click', () => {
					this.loadSavedChain(chain);
					this.closeHistoryMenu();
				});

				item.addEventListener('mouseenter', () => {
					item.style.background = 'var(--background-modifier-hover)';
				});

				item.addEventListener('mouseleave', () => {
					item.style.background = 'transparent';
				});
			});
		}

		// 点击外部关闭菜单
		const closeMenu = (e: MouseEvent) => {
			if (!menu.contains(e.target as Node)) {
				this.closeHistoryMenu();
			}
		};
		this.historyMenuCloseHandler = closeMenu;
		this.historyMenuCloseTimer = window.setTimeout(() => {
			document.addEventListener('click', closeMenu);
			this.historyMenuCloseTimer = null;
		}, 100);
	}

	private closeHistoryMenu(): void {
		const existingMenu = this.containerEl.querySelector('.codec-history-menu');
		if (existingMenu) {
			existingMenu.remove();
		}
		if (this.historyMenuCloseTimer !== null) {
			window.clearTimeout(this.historyMenuCloseTimer);
			this.historyMenuCloseTimer = null;
		}
		if (this.historyMenuCloseHandler) {
			document.removeEventListener('click', this.historyMenuCloseHandler);
			this.historyMenuCloseHandler = null;
		}
	}

	private async renameSavedChain(chainId: string): Promise<void> {
		const savedChains = this.plugin.data?.savedChains || [];
		const chain = savedChains.find((item: any) => item.id === chainId);
		if (!chain) {
			new Notice('未找到历史记录');
			return;
		}

		const newName = window.prompt('请输入新的历史记录名称', chain.name)?.trim();
		if (!newName || newName === chain.name) {
			return;
		}

		const duplicate = savedChains.some((item: any) => item.id !== chainId && item.name === newName);
		if (duplicate) {
			new Notice('历史记录名称已存在');
			return;
		}

		chain.name = newName;
		chain.lastUsed = Date.now();
		await this.plugin.saveData(this.plugin.data);
		new Notice(`历史记录已重命名为: ${newName}`);
		this.closeHistoryMenu();
		this.showChainHistory();
	}

	private async deleteSavedChain(chainId: string): Promise<void> {
		const savedChains = this.plugin.data?.savedChains || [];
		const chain = savedChains.find((item: any) => item.id === chainId);
		if (!chain) {
			new Notice('未找到历史记录');
			return;
		}

		const confirmed = window.confirm(`确定要删除历史记录 "${chain.name}" 吗？`);
		if (!confirmed) {
			return;
		}

		this.plugin.data.savedChains = savedChains.filter((item: any) => item.id !== chainId);
		await this.plugin.saveData(this.plugin.data);
		new Notice(`历史记录 "${chain.name}" 已删除`);
		this.closeHistoryMenu();
		this.showChainHistory();
	}

	// 加载已保存的操作链
	private loadSavedChain(chain: any): void {
		// 清空当前操作链
		this.clearOperationChain();
		
		// 重置所有状态
		if (this.chainStateManager) {
			this.chainStateManager.resetAll();
		}
		
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const placeholder = chainContainer?.querySelector('[data-placeholder="true"]');

		if (placeholder) {
			placeholder.remove();
		}

		// 添加操作链项目
		chain.operations.forEach((op: any) => {
			this.addOperationToChain(op.operationId, op.config);
		});

		// 更新最后使用时间
		chain.lastUsed = Date.now();
		void this.plugin.saveData(this.plugin.data);

		new Notice(`已加载操作链: ${chain.name}`);
	}

	// 保存操作链到数据存储
	public async saveOperationChainWithName(name: string): Promise<boolean> {
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const chainItems = chainContainer.querySelectorAll('.codec-chain-item');

		if (chainItems.length === 0) {
			new Notice('没有操作链可保存');
			return false;
		}

		const operations = Array.from(chainItems).map(item => {
			const operationId = item.getAttribute('data-chain-operation-id');
			const configStr = item.getAttribute('data-config');
			const config = configStr ? JSON.parse(configStr) : {};
			return { operationId: operationId!, config };
		});

		// 检查重复名称
		const savedChains = this.plugin.data?.savedChains || [];
		const existingIndex = savedChains.findIndex((chain: any) => chain.name === name);

		if (existingIndex >= 0) {
			// 询问用户是否覆盖
			const confirm = window.confirm(`操作链 "${name}" 已存在，是否覆盖？`);
			if (!confirm) {
				new Notice('保存已取消');
				return false;
			}
			// 更新现有操作链
			const existingChain = savedChains[existingIndex];
			if (existingChain) {
				savedChains[existingIndex] = {
					id: existingChain.id,
					name,
					operations,
					createdAt: existingChain.createdAt,
					lastUsed: Date.now()
				};
			}
		} else {
			// 创建新操作链
			savedChains.push({
				id: `chain-${Date.now()}`,
				name,
				operations,
				createdAt: Date.now(),
				lastUsed: Date.now()
			});
		}

		this.plugin.data.savedChains = savedChains;
		await this.plugin.saveData(this.plugin.data);
		new Notice(`操作链 "${name}" 已保存`);
		return true;
	}

	private copyResult(): void {
		const outputArea = this.containerEl.querySelector('.codec-output-area') as HTMLTextAreaElement;
		navigator.clipboard.writeText(outputArea.value).then(() => {
			this.plugin.showMessage('结果已复制到剪贴板');
		});
	}

	private replaceSelectedText(): void {
		const outputArea = this.containerEl.querySelector('.codec-output-area') as HTMLTextAreaElement;
		this.plugin.replaceSelectedText(outputArea.value);
	}

	/**
	 * 继续执行操作链
	 */
	private continueExecution(): void {
		if (this.currentBreakpointIndex < 0) {
			return;
		}
		
		// 隐藏继续执行容器
		const continueContainer = this.containerEl.querySelector('[data-continue-container]') as HTMLElement;
		if (continueContainer) {
			continueContainer.removeClass('visible');
		}
		
		// 从下一个操作开始执行
		this.executeOperationChainFrom(this.currentBreakpointIndex + 1);
	}

	/**
	 * 从指定索引开始执行操作链
	 */
	private async executeOperationChainFrom(startIndex: number): Promise<void> {
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const chainItems = chainContainer.querySelectorAll('.codec-chain-item');
		const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
		const outputArea = this.containerEl.querySelector('.codec-output-area') as HTMLTextAreaElement;
		
		if (!inputArea.value) {
			outputArea.value = '请输入要处理的文本';
			return;
		}
		
		// 构建操作链配置
		const operations: any[] = [];
		chainItems.forEach((item, index) => {
			if (index < startIndex) return;
			
			const operationId = item.getAttribute('data-chain-operation-id');
			const configStr = item.getAttribute('data-config');
			const config = configStr ? JSON.parse(configStr) : {};
			
			if (operationId) {
				operations.push({ operationId, config });
			}
		});
		
		if (operations.length === 0) {
			outputArea.value = '没有可执行的操作';
			return;
		}
		
		try {
			const input = inputArea.value;
			outputArea.value = '正在执行...';
			
			// 执行操作链
			const result = await this.plugin.chainProcessor.executeChain(input, operations, {
				onProgress: (current, total) => {
					outputArea.value = `正在执行第 ${current + startIndex}/${total + startIndex} 步...`;
				},
				getRuntimeState: (index) => {
					const actualIndex = startIndex + index;
					const item = chainItems[actualIndex];
					if (!item) return undefined;
					
					const operationId = item.getAttribute('data-chain-operation-id');
					if (!operationId) return undefined;
					
					return this.chainStateManager?.getItemState(operationId);
				},
				onBreakpoint: (operationIndex) => {
					const actualIndex = startIndex + operationIndex;
					this.currentBreakpointIndex = actualIndex;
					this.showContinueButton();
					
					const item = chainItems[actualIndex];
					const operationId = item?.getAttribute('data-chain-operation-id');
					
					new Notice(`断点：操作 "${operationId}" 处停止`);
				}
			});
			
			if (result.success) {
				outputArea.value = result.data;
				this.currentBreakpointIndex = -1;
				this.hideContinueButton();
			} else {
				outputArea.value = `执行失败: ${result.error}`;
			}
		} catch (error) {
			outputArea.value = `执行出错: ${error instanceof Error ? error.message : '未知错误'}`;
		}
	}

	/**
	 * 显示继续执行按钮
	 */
	private showContinueButton(): void {
		const continueContainer = this.containerEl.querySelector('[data-continue-container]') as HTMLElement;
		if (continueContainer) {
			continueContainer.addClass('visible');
		}
	}

	/**
	 * 隐藏继续执行按钮
	 */
	private hideContinueButton(): void {
		const continueContainer = this.containerEl.querySelector('[data-continue-container]') as HTMLElement;
		if (continueContainer) {
			continueContainer.removeClass('visible');
		}
	}
}
