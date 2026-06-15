import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class UnicodeEncodeOperation extends BaseOperation {
	id = 'unicode-encode';
	name = 'Unicode 转义编码';
	category = OperationCategory.ENCODING;
	description = '将文本编码为 Unicode 转义序列格式';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			let unicode = '';
			for (let i = 0; i < input.length; i++) {
				const charCode = input.charCodeAt(i);
				const hex = charCode.toString(16).padStart(4, '0');
				unicode += `\\u${hex}`;
			}
			return unicode;
		} catch (error) {
			throw new Error(`Unicode 编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}

export class UnicodeDecodeOperation extends BaseOperation {
	id = 'unicode-decode';
	name = 'Unicode 转义解码';
	category = OperationCategory.DECODING;
	description = '将 Unicode 转义序列解码为文本';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		const unicodePattern = /\\u[\da-fA-F]{4}/g;
		const matches = input.match(/\\u[\da-fA-F]{0,4}/g);
		
		if (matches) {
			for (const match of matches) {
				if (match.length === 2) { // 只有 \u
					return { valid: false, error: '不完整的 Unicode 转义序列' };
				}
				if (match.length > 2 && match.length < 6) { // \uXXX 格式，不完整
					return { valid: false, error: 'Unicode 转义序列长度不足' };
				}
			}
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			return input.replace(/\\u([\da-fA-F]{4})/g, (match, hex) => {
				const charCode = parseInt(hex, 16);
				return String.fromCharCode(charCode);
			});
		} catch (error) {
			throw new Error(`Unicode 解码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}