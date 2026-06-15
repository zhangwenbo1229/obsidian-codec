import { ItemView, WorkspaceLeaf, Notice, Modal, InputModal, setIcon } from 'obsidian';
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
	
	// 状态管理相关属性
	private chainStateManager?: ChainStateManager;
	private itemControllers: Map<string, OperationChainItemController> = new Map();
	private currentBreakpointIndex: number = -1;
	private isBreakpointMode: boolean = false;

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
		// 清理资源
	}

	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		
		container.empty();
		
		this.renderThreePanelLayout(container);
	}

	private renderThreePanelLayout(container: HTMLElement): void {
		const layout = container.createDiv({
			cls: 'codec-container codec-layout',
			attr: { style: 'display: flex; height: 100%; gap: var(--codec-space-md); padding: var(--codec-space-lg);' }
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
			attr: { style: 'margin-top: 10px; height: calc(100vh - 250px); overflow-y: auto; position: relative; z-index: 1;' }
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
			datetime: operations.filter(op => op.category === 'datetime')
		};

		this.renderOperationCategory(container, '编码', groupedOps.encoding);
		this.renderOperationCategory(container, '解码', groupedOps.decoding);
		this.renderOperationCategory(container, '哈希', groupedOps.hash);
		this.renderOperationCategory(container, '加密', groupedOps.encryption);
		this.renderOperationCategory(container, '解密', groupedOps.decryption);
		this.renderOperationCategory(container, '数据美化', groupedOps.beautify);
		this.renderOperationCategory(container, '时间日期', groupedOps.datetime);
		
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
				style: 'height: calc(100vh - 300px); overflow-y: auto; border: 2px dashed var(--background-modifier-border); border-radius: 8px; padding: 17px; background: var(--background-secondary);',
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
		panel.style.height = '100%';

		const inputSection = panel.createEl('div', {
			cls: 'codec-input-section',
			attr: { style: 'margin-bottom: 15px; flex: 1; display: flex; flex-direction: column;' }
		});

		const inputHeader = inputSection.createEl('div', {
			cls: 'codec-input-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' }
		});

		inputHeader.createEl('label', { 
			text: '输入:',
			attr: { style: 'display: block; font-weight: 500; margin: 0;' }
		});

		const clearInputButton = inputHeader.createEl('span', {
			cls: 'codec-clear-input-btn',
			attr: { style: 'color: red; cursor: pointer; font-size: 13px; font-weight: 500; user-select: none;' },
			text: '清空'
		});

		const inputArea = inputSection.createEl('textarea', {
			cls: 'codec-input-area',
			attr: { 
				style: 'width: 100%; flex: 1; min-height: 110px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace;',
				placeholder: '输入要处理的文本...'
			}
		});

		clearInputButton.addEventListener('click', () => {
			inputArea.value = '';
			inputArea.dispatchEvent(new Event('input'));
		});
		
		// 添加输入变化监听器
		inputArea.addEventListener('input', () => {
			this.checkImmediateExecution();
		});

		const outputSection = panel.createEl('div', {
			cls: 'codec-output-section',
			attr: { style: 'margin-bottom: 15px; flex: 1; display: flex; flex-direction: column;' }
		});

		const outputHeader = outputSection.createEl('div', {
			cls: 'codec-output-header',
			attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' }
		});

		outputHeader.createEl('label', { 
			text: '输出:',
			attr: { style: 'display: block; font-weight: 500; margin: 0;' }
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
				style: 'width: 100%; flex: 1; min-height: 110px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace; readonly: true;'
			}
		});

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
		const saveButton = this.containerEl.querySelector('.codec-save-button');
		const copyButton = this.containerEl.querySelector('.codec-copy-button');
		const replaceButton = this.containerEl.querySelector('.codec-replace-button');

		executeButton?.addEventListener('click', () => this.executeOperationChain());
		clearButton?.addEventListener('click', () => this.clearOperationChain());
		saveButton?.addEventListener('click', () => this.showSaveChainModal());
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
				const option = nonceLengthSelector.createEl('option', { value: length, text: `${length}字节` });
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
				const option = nonceLengthSelector.createEl('option', { value: length, text: `${length}字节` });
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
			const dragEvent = e as DragEvent;
			dragEvent.dataTransfer!.effectAllowed = 'move';
			dragEvent.dataTransfer!.setData('text/plain', operationId);
			
			// 记录被拖拽项的原始位置
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			const originalIndex = allItems.indexOf(chainItem);
			dragEvent.dataTransfer!.setData('original-index', originalIndex.toString());
			
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
			
			const dragEvent = e as DragEvent;
			dragEvent.dataTransfer!.dropEffect = 'move';
			
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			const targetIndex = allItems.indexOf(chainItem);
			const draggedIndex = parseInt(dragEvent.dataTransfer!.getData('original-index') || '0');
			
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
			
			const dragEvent = e as DragEvent;
			const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
			const allItems = Array.from(chainContainer.querySelectorAll('.codec-chain-item'));
			
			const draggedOperationId = dragEvent.dataTransfer!.getData('text/plain');
			const originalIndex = parseInt(dragEvent.dataTransfer!.getData('original-index') || '0');
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
					// 在实际的 Obsidian 环境中，这里应该使用 app.vault.adapter.writeFile
					// 但为了兼容性，我们使用简单的文件名提示
					const fileName = file.name || 'codec-output.txt';
					new Notice(`已保存到: ${fileName}`);
				} catch (error) {
					new Notice('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
				}
			}
		};
		
		input.click();
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
			existingMenu.remove();
			return;
		}

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
						style: 'padding: 12px; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center;'
					}
				});

				const itemInfo = item.createEl('div', {
					attr: { style: 'flex: 1;' }
				});
				
				itemInfo.createEl('div', {
					text: chain.name,
					attr: { style: 'font-weight: 500; margin-bottom: 4px;' }
				});
				
				itemInfo.createEl('div', {
					text: `${chain.operations.length}步 • ${new Date(chain.lastUsed).toLocaleTimeString()}`,
					attr: { style: 'font-size: 12px; color: var(--text-muted);' }
				});

				item.addEventListener('click', () => {
					this.loadSavedChain(chain);
					menu.remove();
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
				menu.remove();
				document.removeEventListener('click', closeMenu);
			}
		};
		setTimeout(() => document.addEventListener('click', closeMenu), 100);
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
	public saveOperationChainWithName(name: string): void {
		const chainContainer = this.containerEl.querySelector('[data-chain-container]') as HTMLElement;
		const chainItems = chainContainer.querySelectorAll('.codec-chain-item');

		if (chainItems.length === 0) {
			new Notice('没有操作链可保存');
			return;
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
				return;
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
		void this.plugin.saveData(this.plugin.data);
		new Notice(`操作链 "${name}" 已保存`);
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