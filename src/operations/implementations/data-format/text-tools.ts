import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

interface FindReplaceConfig {
	find: string;
	replaceWith: string;
}

interface AddLineAffixConfig {
	position: 'start' | 'end';
	text: string;
	deduplicate: boolean;
}

interface LineToSymbolConfig {
	symbol: string;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateRequiredInput(input: string, error: string): ValidationResult {
	if (!input) {
		return { valid: false, error };
	}
	return { valid: true };
}

export class FindReplaceOperation extends BaseOperation {
	id = 'find-replace';
	name = '查找替换';
	category = OperationCategory.DATA_FORMAT;
	description = '批量查找文本并替换为指定内容';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input, '请输入要处理的内容');
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const operationConfig = config as unknown as Partial<FindReplaceConfig>;
		const find = operationConfig.find ?? '';
		const replaceWith = operationConfig.replaceWith ?? '';

		if (!find) {
			throw new Error('请输入查找内容');
		}

		return input.split(find).join(replaceWith);
	}

	getConfigUI(): string {
		return 'find-replace';
	}
}

export class DeduplicateOperation extends BaseOperation {
	id = 'deduplicate';
	name = '去重';
	category = OperationCategory.DATA_FORMAT;
	description = '按行去除重复内容，保留首次出现的顺序';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input, '请输入要去重的内容');
	}

	protected async executeLogic(input: string): Promise<string> {
		const seen = new Set<string>();
		const result: string[] = [];

		for (const line of input.split(/\r?\n/)) {
			if (!seen.has(line)) {
				seen.add(line);
				result.push(line);
			}
		}

		return result.join('\n');
	}
}

export class SortLinesOperation extends BaseOperation {
	id = 'sort-lines';
	name = '排序';
	category = OperationCategory.DATA_FORMAT;
	description = '按首字母对每行内容进行升序排序';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input, '请输入要排序的内容');
	}

	protected async executeLogic(input: string): Promise<string> {
		return input
			.split(/\r?\n/)
			.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
			.join('\n');
	}
}

export class AddLineAffixOperation extends BaseOperation {
	id = 'add-line-affix';
	name = '首尾添加';
	category = OperationCategory.DATA_FORMAT;
	description = '在每行行首或行尾添加指定内容，可选择避免重复添加';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input, '请输入要处理的内容');
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const operationConfig = config as unknown as Partial<AddLineAffixConfig>;
		const position = operationConfig.position === 'end' ? 'end' : 'start';
		const text = operationConfig.text ?? '';
		const deduplicate = operationConfig.deduplicate ?? false;

		if (!text) {
			throw new Error('请输入要添加的内容');
		}

		return input
			.split(/\r?\n/)
			.map(line => {
				if (position === 'start') {
					if (deduplicate && line.startsWith(text)) {
						const pattern = new RegExp(`^(?:${escapeRegExp(text)})+`);
						return line.replace(pattern, text);
					}
					return `${text}${line}`;
				}

				if (deduplicate && line.endsWith(text)) {
					const pattern = new RegExp(`(?:${escapeRegExp(text)})+$`);
					return line.replace(pattern, text);
				}
				return `${line}${text}`;
			})
			.join('\n');
	}

	getConfigUI(): string {
		return 'add-line-affix';
	}
}

export class UpperCaseOperation extends BaseOperation {
	id = 'upper-case';
	name = '转大写';
	category = OperationCategory.DATA_FORMAT;
	description = '将输入中的小写字母转换为大写';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.toUpperCase();
	}
}

export class LowerCaseOperation extends BaseOperation {
	id = 'lower-case';
	name = '转小写';
	category = OperationCategory.DATA_FORMAT;
	description = '将输入中的大写字母转换为小写';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.toLowerCase();
	}
}

export class SwapCaseOperation extends BaseOperation {
	id = 'swap-case';
	name = '大小写互转';
	category = OperationCategory.DATA_FORMAT;
	description = '将输入中的大小写字母互相转换';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return Array.from(input).map(char => {
			const upper = char.toUpperCase();
			const lower = char.toLowerCase();
			if (char === upper && char !== lower) {
				return lower;
			}
			if (char === lower && char !== upper) {
				return upper;
			}
			return char;
		}).join('');
	}
}

export class RemoveWhitespaceOperation extends BaseOperation {
	id = 'remove-whitespace';
	name = '移除空白';
	category = OperationCategory.DATA_FORMAT;
	description = '移除输入中的所有空白字符';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.replace(/\s+/g, '');
	}
}

export class LineToSymbolOperation extends BaseOperation {
	id = 'line-to-symbol';
	name = '行转符号';
	category = OperationCategory.DATA_FORMAT;
	description = '将输入中的换行符替换为指定符号';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const symbolConfig = config as unknown as Partial<LineToSymbolConfig>;
		return input.split(/\r?\n/).join(symbolConfig.symbol ?? ',');
	}

	getConfigUI(): string {
		return 'line-to-symbol';
	}
}

export class JoinToSingleLineOperation extends BaseOperation {
	id = 'join-to-single-line';
	name = '合并为一行';
	category = OperationCategory.DATA_FORMAT;
	description = '将多行输入合并为一行';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.split(/\r?\n/).join(' ');
	}
}

export class AutoWrapOperation extends BaseOperation {
	id = 'auto-wrap';
	name = '自动换行';
	category = OperationCategory.DATA_FORMAT;
	description = '根据空格将输入自动换行';

	protected validateInput(): ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input
			.split(/\s+/)
			.filter(Boolean)
			.join('\n');
	}
}
