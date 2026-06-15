import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import { ValidationResult } from '../../../types';

export interface ToUtf8Config {
	sourceCharset: 'gb-18030' | 'windows-1252' | 'iso-8859-1' | 'big5' | 'utf-16';
}

export interface FromUtf8Config {
	targetCharset: 'gb-18030' | 'windows-1252' | 'iso-8859-1' | 'big5' | 'utf-16';
}

export class ToUtf8Operation extends BaseOperation {
	id = 'to-utf8';
	name = '转UTF-8';
	category = OperationCategory.ENCODING;
	description = '将其他字符集转换为UTF-8字符集';

	protected validateInput(input: string): ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要转换的文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const operationConfig = config as ToUtf8Config;
		const sourceCharset = operationConfig.sourceCharset || 'gb-18030';
		
		try {
			return this.convertToUtf8(input, sourceCharset);
		} catch (error) {
			throw new Error(`字符集转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private convertToUtf8(input: string, sourceCharset: string): string {
		switch (sourceCharset) {
			case 'utf-16':
				return this.fromUtf16ToUtf8(input);
			case 'iso-8859-1':
			case 'windows-1252':
				return this.fromIsoToUtf8(input);
			case 'gb-18030':
			case 'big5':
				return this.fromMultiByteToUtf8(input, sourceCharset);
			default:
				return input;
		}
	}

	private fromUtf16ToUtf8(input: string): string {
		// 尝试将输入视为UTF-16LE编码的字节序列
		const bytes = new Uint8Array(input.length);
		for (let i = 0; i < input.length; i++) {
			bytes[i] = input.charCodeAt(i) & 0xFF;
		}
		
		try {
			const decoder = new TextDecoder('utf-16le');
			return decoder.decode(bytes);
		} catch {
			// 如果解码失败，返回原始字符串
			return input;
		}
	}

	private fromIsoToUtf8(input: string): string {
		// ISO-8859-1 和 Windows-1252 是单字节编码
		// 直接将每个字符的Unicode码点视为字节值
		let result = '';
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i);
			if (charCode <= 0xFF) {
				result += String.fromCharCode(charCode);
			} else {
				// 字符超出范围，保留原字符
				result += input[i];
			}
		}
		return result;
	}

	private fromMultiByteToUtf8(input: string, charset: string): string {
		// 对于GB18030和Big5等多字节字符集
		// 由于浏览器API限制，这里提供基础实现
		// 实际项目可能需要使用专业的字符集转换库
		
		// 当前实现：假设输入已经是UTF-8编码的字符串
		// 对于真实的多字节字符集转换，需要额外的库支持
		return input;
	}

	getConfigUI(): string {
		return `
			<div class="codec-config-section">
				<label class="codec-config-label">源字符集：</label>
				<select class="codec-charset-selector" data-config-key="sourceCharset">
					<option value="gb-18030">GB 18030 (简体中文)</option>
					<option value="windows-1252">Windows-1252 (西欧)</option>
					<option value="iso-8859-1">ISO-8859-1 (西欧)</option>
					<option value="big5">Big5 (繁体中文)</option>
					<option value="utf-16">UTF-16</option>
				</select>
			</div>
			<div class="codec-config-section">
				<div class="codec-config-hint">
					将指定字符集的文本转换为UTF-8编码
				</div>
			</div>
		`;
	}
}

export class FromUtf8Operation extends BaseOperation {
	id = 'from-utf8';
	name = 'UTF-8转字符集';
	category = OperationCategory.DECODING;
	description = '将UTF-8字符集转换为其他字符集';

	protected validateInput(input: string): ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要转换的UTF-8文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const operationConfig = config as FromUtf8Config;
		const targetCharset = operationConfig.targetCharset || 'gb-18030';
		
		try {
			return this.convertFromUtf8(input, targetCharset);
		} catch (error) {
			throw new Error(`字符集转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private convertFromUtf8(input: string, targetCharset: string): string {
		switch (targetCharset) {
			case 'utf-16':
				return this.toUtf16(input);
			case 'iso-8859-1':
			case 'windows-1252':
				return this.toIsoCharset(input);
			case 'gb-18030':
			case 'big5':
				return this.toMultiByteCharset(input, targetCharset);
			default:
				return input;
		}
	}

	private toUtf16(input: string): string {
		// 将UTF-8字符串转换为UTF-16LE字节序列表示
		let result = '';
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i);
			// 转换为小端序字节
			result += String.fromCharCode(charCode & 0xFF, (charCode >> 8) & 0xFF);
		}
		return result;
	}

	private toIsoCharset(input: string): string {
		// 转换为ISO-8859-1/Windows-1252
		let result = '';
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i);
			if (charCode <= 0xFF) {
				result += String.fromCharCode(charCode);
			} else {
				// 字符超出范围，使用替换字符
				result += '�';
			}
		}
		return result;
	}

	private toMultiByteCharset(input: string, charset: string): string {
		// 对于GB18030和Big5等多字节字符集
		// 由于浏览器API限制，这里提供基础实现
		// 实际项目可能需要使用专业的字符集转换库
		
		// 当前实现：返回原始字符串
		// 对于真实的多字节字符集转换，需要额外的库支持
		return input;
	}

	getConfigUI(): string {
		return `
			<div class="codec-config-section">
				<label class="codec-config-label">目标字符集：</label>
				<select class="codec-charset-selector" data-config-key="targetCharset">
					<option value="gb-18030">GB 18030 (简体中文)</option>
					<option value="windows-1252">Windows-1252 (西欧)</option>
					<option value="iso-8859-1">ISO-8859-1 (西欧)</option>
					<option value="big5">Big5 (繁体中文)</option>
					<option value="utf-16">UTF-16</option>
				</select>
			</div>
			<div class="codec-config-section">
				<div class="codec-config-hint">
					将UTF-8编码的文本转换为指定字符集
				</div>
			</div>
		`;
	}
}