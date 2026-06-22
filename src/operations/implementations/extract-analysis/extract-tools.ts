import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

const URL_REGEX = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const DOMAIN_REGEX = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi;

function validateRequiredInput(input: string): ValidationResult {
	if (!input) {
		return { valid: false, error: '请输入要提取的内容' };
	}
	return { valid: true };
}

function uniqueMatches(matches: string[]): string[] {
	return Array.from(new Set(matches));
}

export class ExtractStringOperation extends BaseOperation {
	id = 'extract-strings';
	name = '提取字符串';
	category = OperationCategory.EXTRACT_ANALYSIS;
	description = '提取输入中由引号包裹的字符串内容';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		return input
			.match(/\S+/g)
			?.map(token => token.replace(/^["'`]+|["'`,.;:!?]+$/g, ''))
			.filter(Boolean)
			.join('\n') ?? '';
	}
}

export class ExtractLineCountOperation extends BaseOperation {
	id = 'extract-line-count';
	name = '提取行';
	category = OperationCategory.EXTRACT_ANALYSIS;
	description = '输出输入内容的行数';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		return String(input.split(/\r\n|\r|\n/).length);
	}
}

export class ExtractIPv4Operation extends BaseOperation {
	id = 'extract-ipv4';
	name = '提取IPv4';
	category = OperationCategory.EXTRACT_ANALYSIS;
	description = '提取输入中所有符合 IPv4 格式的地址';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		const candidates = input.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
		const valid = candidates.filter(candidate =>
			candidate.split('.').every(part => {
				if (part.length > 1 && part.startsWith('0')) {
					return false;
				}
				const value = Number(part);
				return Number.isInteger(value) && value >= 0 && value <= 255;
			})
		);
		return uniqueMatches(valid).join('\n');
	}
}

export class ExtractUrlOperation extends BaseOperation {
	id = 'extract-url';
	name = '提取URL';
	category = OperationCategory.EXTRACT_ANALYSIS;
	description = '提取输入中所有 URL';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		const matches = input.match(URL_REGEX) ?? [];
		return uniqueMatches(matches.map(url => url.replace(/[),.;!?]+$/g, ''))).join('\n');
	}
}

export class ExtractDomainOperation extends BaseOperation {
	id = 'extract-domain';
	name = '提取域名';
	category = OperationCategory.EXTRACT_ANALYSIS;
	description = '提取输入中所有符合域名格式的字符串';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		const matches = input.match(DOMAIN_REGEX) ?? [];
		return uniqueMatches(matches.map(domain => domain.toLowerCase())).join('\n');
	}
}
