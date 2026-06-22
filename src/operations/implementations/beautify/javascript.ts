import { js as beautifyJs } from 'js-beautify';
import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

export class JavaScriptPrettifyOperation extends BaseOperation {
	id = 'javascript-prettify';
	name = 'javascript美化';
	category = OperationCategory.BEAUTIFY;
	description = '对 JavaScript 输入进行格式化美化';

	protected validateInput(input: string): ValidationResult {
		if (!input || !input.trim()) {
			return { valid: false, error: '请输入要处理的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return beautifyJs(input, {
			indent_size: 2,
			end_with_newline: true,
			space_in_empty_paren: false
		});
	}
}

export class JavaScriptMinifyOperation extends BaseOperation {
	id = 'javascript-minify';
	name = 'JavaScript压缩';
	category = OperationCategory.BEAUTIFY;
	description = '压缩 JavaScript 输入';

	protected validateInput(input: string): ValidationResult {
		if (!input || !input.trim()) {
			return { valid: false, error: '请输入要处理的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return minifyJavaScript(input);
	}
}

function minifyJavaScript(input: string): string {
	let result = '';
	let i = 0;
	let quote: '"' | "'" | '`' | null = null;
	let escaping = false;
	let pendingSpace = false;

	while (i < input.length) {
		const char = input[i] ?? '';
		const next = input[i + 1] ?? '';

		if (quote) {
			result += char;

			if (escaping) {
				escaping = false;
			} else if (char === '\\') {
				escaping = true;
			} else if (char === quote) {
				quote = null;
			}

			i++;
			continue;
		}

		if (char === '/' && next === '/') {
			i += 2;
			while (i < input.length && !isLineBreak(input[i] ?? '')) {
				i++;
			}
			pendingSpace = true;
			continue;
		}

		if (char === '/' && next === '*') {
			i += 2;
			while (i < input.length && !((input[i] ?? '') === '*' && (input[i + 1] ?? '') === '/')) {
				i++;
			}
			i += 2;
			pendingSpace = true;
			continue;
		}

		if (isWhitespace(char)) {
			pendingSpace = true;
			i++;
			continue;
		}

		if (pendingSpace && needsSpace(lastChar(result), char)) {
			result += ' ';
		}
		pendingSpace = false;

		if (char === '"' || char === "'" || char === '`') {
			quote = char;
		}

		result += char;
		i++;
	}

	return result.trim();
}

function isWhitespace(char: string): boolean {
	return /\s/.test(char);
}

function isLineBreak(char: string): boolean {
	return char === '\n' || char === '\r';
}

function lastChar(value: string): string {
	return value[value.length - 1] ?? '';
}

function needsSpace(previous: string, next: string): boolean {
	if (!previous || !next) {
		return false;
	}

	if (isIdentifierPart(previous) && isIdentifierPart(next)) {
		return true;
	}

	return (previous === '+' && next === '+') || (previous === '-' && next === '-');
}

function isIdentifierPart(char: string): boolean {
	return /[A-Za-z0-9_$]/.test(char);
}
