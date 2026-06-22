import { OperationCategory, UserPreferences } from './types';

export const OPERATION_CATEGORIES = {
	[OperationCategory.ENCODING]: '编码',
	[OperationCategory.DECODING]: '解码',
	[OperationCategory.HASH]: '哈希',
	[OperationCategory.ENCRYPTION]: '加密',
	[OperationCategory.DECRYPTION]: '解密',
	[OperationCategory.BEAUTIFY]: '数据美化',
	[OperationCategory.DATA_FORMAT]: '数据格式',
	[OperationCategory.CUSTOM]: '自定义',
	[OperationCategory.DATETIME]: '时间日期'
};

export const DEFAULT_PREFERENCES: UserPreferences = {
	autoExecute: false,
	showOutputLength: true,
	maxHistoryItems: 20,
	shortcutKey: 'Ctrl+Shift+C',
	theme: 'obsidian'
};

export const DEFAULT_PLUGIN_STATE = {
	savedChains: [],
	activeChain: {
		id: 'default',
		name: '默认操作链',
		operations: [],
		createdAt: Date.now(),
		lastUsed: Date.now()
	},
	preferences: DEFAULT_PREFERENCES,
	viewState: {}
};

export const MAX_INPUT_LENGTH = 1024 * 1024; // 1MB
export const EXECUTION_TIMEOUT = 5000; // 5秒

export const VIEW_TYPE = 'codec-view';
