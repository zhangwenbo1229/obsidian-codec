import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class PythonPrettifyOperation extends BaseOperation {
	id = 'python-prettify';
	name = 'Python美化';
	category = OperationCategory.BEAUTIFY;
	description = '美化和格式化Python代码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入Python代码' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const indent = (config.indent as number) || 4;
			return this.prettifyPython(input, indent);
		} catch (error) {
			throw new Error(`Python美化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private prettifyPython(code: string, indentSize: number): string {
		const lines = code.split('\n');
		const result: string[] = [];
		let currentIndent = 0;
		let inMultiLineString = false;
		let multiLineStringChar = '';
		let inParentheses = 0;
		let inBrackets = 0;
		let inBraces = 0;

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			
			// 跳过空行但保留结构
			if (line.trim().length === 0) {
				result.push('');
				continue;
			}

			// 检查多行字符串
			if (line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
				if (!inMultiLineString) {
					inMultiLineString = true;
					multiLineStringChar = line.trim().substring(0, 3);
					result.push(line);
					continue;
				} else if (line.trim().endsWith(multiLineStringChar)) {
					inMultiLineString = false;
					result.push(line);
					continue;
				} else {
					result.push(line);
					continue;
				}
			}

			if (inMultiLineString) {
				result.push(line);
				continue;
			}

			// 处理单行注释
			if (line.trim().startsWith('#')) {
				result.push(' '.repeat(currentIndent * indentSize) + line.trim());
				continue;
			}

			// 移除现有缩进
			let trimmed = line.trim();

			// 检查括号、方括号、花括号
			inParentheses += (trimmed.match(/\(/g) || []).length;
			inParentheses -= (trimmed.match(/\)/g) || []).length;
			inBrackets += (trimmed.match(/\[/g) || []).length;
			inBrackets -= (trimmed.match(/\]/g) || []).length;
			inBraces += (trimmed.match(/\{/g) || []).length;
			inBraces -= (trimmed.match(/\}/g) || []).length;

			// 减少缩进的情况
			if (trimmed.match(/^(else|elif|except|finally)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
			}

			// 添加新的缩进
			result.push(' '.repeat(currentIndent * indentSize) + trimmed);

			// 增加缩进的情况
			if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
				// 检查是否是真正的代码块（不是注释）
				const beforeComment = trimmed.split('#')[0].trim();
				if (beforeComment.endsWith(':')) {
					currentIndent++;
				}
			}

			// 如果行以反斜杠结尾，下一行需要额外缩进
			if (trimmed.endsWith('\\')) {
				currentIndent++;
			}

			// 处理行内括号情况
			if (inParentheses > 0 || inBrackets > 0 || inBraces > 0) {
				// 不增加缩进，但下一行需要跟随
				continue;
			}
		}

		return result.join('\n');
	}
}