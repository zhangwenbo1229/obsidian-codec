import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class URLEncodeOperation extends BaseOperation {
	id = 'url-encode';
	name = 'URL 编码';
	category = OperationCategory.ENCODING;
	description = '将文本编码为 URL 安全格式';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const encodeAll = config.encodeAll as boolean || false;
			
			if (encodeAll) {
				// 全部编码：对所有字符包括数字字母进行编码
				let result = '';
				for (let i = 0; i < input.length; i++) {
					const charCode = input.charCodeAt(i);
					// 对所有字符进行百分号编码
					result += '%' + charCode.toString(16).toUpperCase().padStart(2, '0');
				}
				return result;
			} else {
				// 特殊字符编码：对特殊字符进行URL编码，包括单引号
				let encoded = encodeURIComponent(input);
				// 额外编码单引号以符合用户的期望
				encoded = encoded.replace(/'/g, '%27');
				return encoded;
			}
		} catch (error) {
			throw new Error(`URL 编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}

export class URLDecodeOperation extends BaseOperation {
	id = 'url-decode';
	name = 'URL 解码';
	category = OperationCategory.DECODING;
	description = '将 URL 编码格式解码为文本';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			return decodeURIComponent(input);
		} catch (error) {
			throw new Error(`URL 解码失败: 输入不是有效的 URL 编码格式`);
		}
	}
}