import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class Base64EncodeOperation extends BaseOperation {
	id = 'base64-encode';
	name = 'Base64 编码';
	category = OperationCategory.ENCODING;
	description = '将文本编码为 Base64 格式';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: true }; // 允许空字符串
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		if (input === '') {
			return '';
		}
		
		try {
			const format = config.format as string || 'standard';
			const padding = config.padding as boolean !== false;
			
			if (format === 'url-safe') {
				// URL 安全 Base64 格式
				let result = btoa(unescape(encodeURIComponent(input)));
				result = result.replace(/\+/g, '-').replace(/\//g, '_');
				
				if (!padding) {
					result = result.replace(/=+$/, '');
				}
				
				return result;
			} else {
				// 标准 Base64 格式
				return btoa(unescape(encodeURIComponent(input)));
			}
		} catch (error) {
			throw new Error(`Base64 编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}

export class Base64DecodeOperation extends BaseOperation {
	id = 'base64-decode';
	name = 'Base64 解码';
	category = OperationCategory.DECODING;
	description = '将 Base64 格式解码为文本';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: true }; // 允许空字符串
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		if (input === '') {
			return '';
		}
		
		try {
			// 清理输入：移除可能的空格和换行
			const cleanedInput = input.replace(/\s/g, '');
			
			// 标准Base64解码
			const decoded = atob(cleanedInput);
			
			// 将解码结果转换为UTF-8文本
			return decodeURIComponent(escape(decoded));
		} catch (error) {
			throw new Error(`Base64 解码失败: 输入不是有效的 Base64 格式`);
		}
	}
}