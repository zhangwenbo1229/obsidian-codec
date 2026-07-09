export enum OperationCategory {
	ENCODING = 'encoding',
	DECODING = 'decoding',
	HASH = 'hash',
	ENCRYPTION = 'encryption',
	DECRYPTION = 'decryption',
	BEAUTIFY = 'beautify',
	DATA_FORMAT = 'data-format',
	EXTRACT_ANALYSIS = 'extract-analysis',
	URL_IP = 'url-ip',
	CUSTOM = 'custom',
	DATETIME = 'datetime',
	MAC = 'mac',
	OTHER = 'other'
}

// 新增：文件数据接口
export interface FileData {
	name: string;
	type: string;
	size: number;
	data: string | ArrayBuffer;
	isFile: boolean;
	mimeType?: string;
}

export interface OperationResult {
	success: boolean;
	data: string;
	error?: string;
	metadata?: Record<string, unknown>;
	fileData?: FileData;
}

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

export interface OperationConfig {
	operationId: string;
	config: Record<string, unknown>;
	// 注意：禁用和断点状态不存储在这里，而是通过 DOM 属性管理
}

export interface ChainResult {
	success: boolean;
	data: string;
	error?: string;
	steps: ChainStepResult[];
	breakpoint?: boolean;
}

export interface ChainStepResult {
	step: number;
	operationId: string;
	success: boolean;
	data?: string;
	error?: string;
	skipped?: boolean;
}

export interface OperationChain {
	id: string;
	name: string;
	operations: OperationConfig[];
	createdAt: number;
	lastUsed: number;
}

export interface PluginState {
	savedChains: OperationChain[];
	activeChain: OperationChain;
	preferences: UserPreferences;
	viewState: ViewState;
}

export interface UserPreferences {
	autoExecute: boolean;
	showOutputLength: boolean;
	maxHistoryItems: number;
	shortcutKey: string;
	theme: 'obsidian' | 'dark' | 'light';
	fontConfig?: {
		inputFontFamily?: string;
		inputFontSize?: string;
		outputFontFamily?: string;
		outputFontSize?: string;
	};
}

export interface ViewState {
	selectedCategory?: OperationCategory;
	searchQuery?: string;
	expandedSections?: string[];
}
