import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

const htmlEntities: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;'
};

const reverseHtmlEntities: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'"
};

export class HTMLEntityEncodeOperation extends BaseOperation {
	id = 'html-entity-encode';
	name = 'HTML 实体编码';
	category = OperationCategory.ENCODING;
	description = '将特殊字符编码为 HTML 实体';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const format = config.format as string || 'named';
			const encodeAll = config.encodeAll as boolean || false;

			if (encodeAll) {
				// 全部编码模式：对所有字符进行HTML实体编码
				let result = '';
				for (let i = 0; i < input.length; i++) {
					const charCode = input.charCodeAt(i);
					switch (format) {
						case 'decimal':
							result += `&#${charCode};`;
							break;
						case 'hex':
							result += `&#x${charCode.toString(16).toUpperCase()};`;
							break;
						case 'named':
						default:
							result += `&#${charCode};`; // 全部编码时使用十进制
							break;
					}
				}
				return result;
			} else {
				// 正常模式：只编码特殊字符
				return input.replace(/[&<>"']/g, (char) => {
					const namedEntities: Record<string, string> = {
						'&': '&amp;',
						'<': '&lt;',
						'>': '&gt;',
						'"': '&quot;',
						"'": '&apos;'
					};

					const charCode = char.charCodeAt(0);

					switch (format) {
						case 'decimal':
							return `&#${charCode};`;
						case 'hex':
							return `&#x${charCode.toString(16)};`;
						case 'named':
						default:
							const named = namedEntities[char];
							if (named) {
								return named;
							} else {
								// 显示警告但保持原样
								console.warn(`No named entity for character: ${char}`);
								return char;
							}
					}
				});
			}
		} catch (error) {
			throw new Error(`HTML 实体编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}

export class HTMLEntityDecodeOperation extends BaseOperation {
	id = 'html-entity-decode';
	name = 'HTML 实体解码';
	category = OperationCategory.DECODING;
	description = '将 HTML 实体解码为特殊字符';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const result: string[] = [];
			let lastIndex = 0;
			input.replace(/&[a-zA-Z]+;/g, (match: string, offset: number) => {
				const decoded = reverseHtmlEntities[match];
				if (decoded !== undefined) {
					result.push(input.slice(lastIndex, offset));
					result.push(decoded);
					lastIndex = offset + match.length;
				}
				return match;
			});
			result.push(input.slice(lastIndex));
			return result.join('');
		} catch (error) {
			throw new Error(`HTML 实体解码失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}