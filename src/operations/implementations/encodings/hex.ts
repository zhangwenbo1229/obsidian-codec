import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class HexEncodeOperation extends BaseOperation {
	id = 'hex-encode';
	name = 'Hex 编码';
	category = OperationCategory.ENCODING;
	description = '将文本编码为十六进制格式';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const encoder = new TextEncoder();
			const bytes = encoder.encode(input);
			let hex = '';
			for (const byte of bytes) {
				hex += byte.toString(16).padStart(2, '0');
			}
			return hex;
		} catch (error) {
			throw new Error(`Hex 编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}

export class HexDecodeOperation extends BaseOperation {
	id = 'hex-decode';
	name = 'Hex 解码';
	category = OperationCategory.DECODING;
	description = '将十六进制格式解码为文本';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (input.length === 0) {
			return { valid: true }; // 允许空字符串
		}
		
		if (input.length % 2 !== 0) {
			return { valid: false, error: 'Hex 字符串���度必须是偶数' };
		}
		
		const hexRegex = /^[0-9a-fA-F]+$/;
		if (!hexRegex.test(input)) {
			return { valid: false, error: '输入包含无效的十六进制字符' };
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			if (input === '') {
				return '';
			}
			
			const bytes: number[] = [];
			for (let i = 0; i < input.length; i += 2) {
				const hex = input.substr(i, 2);
				bytes.push(parseInt(hex, 16));
			}
			
			const decoder = new TextDecoder();
			return decoder.decode(new Uint8Array(bytes));
		} catch (error) {
			throw new Error(`Hex 解码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}