import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

function bytesToText(bytes: number[]): string {
	return new TextDecoder().decode(new Uint8Array(bytes));
}

function textToBytes(input: string): Uint8Array {
	return new TextEncoder().encode(input);
}

function splitTokens(input: string): string[] {
	return input.trim().split(/[\s,]+/).filter(Boolean);
}

export class BinaryEncodeOperation extends BaseOperation {
	id = 'binary-encode';
	name = '二进制编码';
	category = OperationCategory.ENCODING;
	description = '将文本按 UTF-8 字节编码为二进制序列';

	protected validateInput(input: string): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return Array.from(textToBytes(input))
			.map(byte => byte.toString(2).padStart(8, '0'))
			.join(' ');
	}
}

export class BinaryDecodeOperation extends BaseOperation {
	id = 'binary-decode';
	name = '二进制解码';
	category = OperationCategory.DECODING;
	description = '将二进制字节序列解码为文本';

	protected validateInput(input: string): ValidationResult {
		if (!input.trim()) {
			return { valid: true };
		}

		const tokens = splitTokens(input);
		const invalid = tokens.find(token => !/^[01]{1,8}$/.test(token));
		if (invalid) {
			return { valid: false, error: `无效的二进制字节: ${invalid}` };
		}

		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		if (!input.trim()) {
			return '';
		}

		const bytes = splitTokens(input).map(token => parseInt(token, 2));
		return bytesToText(bytes);
	}
}

export class DecimalEncodeOperation extends BaseOperation {
	id = 'decimal-encode';
	name = '十进制编码';
	category = OperationCategory.ENCODING;
	description = '将文本按 UTF-8 字节编码为十进制序列';

	protected validateInput(input: string): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return Array.from(textToBytes(input))
			.map(byte => byte.toString(10))
			.join(' ');
	}
}

export class DecimalDecodeOperation extends BaseOperation {
	id = 'decimal-decode';
	name = '十进制解码';
	category = OperationCategory.DECODING;
	description = '将十进制字节序列解码为文本';

	protected validateInput(input: string): ValidationResult {
		if (!input.trim()) {
			return { valid: true };
		}

		const tokens = splitTokens(input);
		const invalid = tokens.find(token => {
			if (!/^\d+$/.test(token)) {
				return true;
			}
			const value = Number(token);
			return !Number.isInteger(value) || value < 0 || value > 255;
		});

		if (invalid) {
			return { valid: false, error: `无效的十进制字节: ${invalid}` };
		}

		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		if (!input.trim()) {
			return '';
		}

		const bytes = splitTokens(input).map(token => Number(token));
		return bytesToText(bytes);
	}
}
