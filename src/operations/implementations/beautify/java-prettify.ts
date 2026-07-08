import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class JavaPrettifyOperation extends BaseOperation {
	id = 'java-prettify';
	name = 'JAVA美化';
	category = OperationCategory.BEAUTIFY;
	description = '美化和格式化JAVA代码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入JAVA代码' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const indent = (config.indent as number) || 4;
			return this.prettifyJava(input, indent);
		} catch (error) {
			throw new Error(`JAVA美化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private prettifyJava(code: string, indentSize: number): string {
		const lines = code.split('\n');
		const result: string[] = [];
		const indent = ' '.repeat(indentSize);
		let currentIndent = 0;
		let inComment = false;
		let inMultiLineComment = false;
		let inString = false;
		let inChar = false;

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			
			// 跳过空行但保留结构
			if (line.trim().length === 0) {
				result.push('');
				continue;
			}

			// 处理字符串和字符字面量
			for (let j = 0; j < line.length; j++) {
				const char = line[j];
				const prevChar = j > 0 ? line[j - 1] : '';

				if (char === '"' && prevChar !== '\\' && !inComment && !inMultiLineComment && !inChar) {
					inString = !inString;
				} else if (char === '\'' && prevChar !== '\\' && !inComment && !inMultiLineComment && !inString) {
					inChar = !inChar;
				}
			}

			// 如果在字符串或字符中，直接输出
			if (inString || inChar) {
				result.push(line);
				continue;
			}

			// 处理注释
			const trimmedLine = line.trim();
			
			// 单行注释
			if (trimmedLine.startsWith('//')) {
				result.push('  '.repeat(currentIndent) + trimmedLine);
				continue;
			}

			// 多行注释开始
			if (trimmedLine.startsWith('/*')) {
				inMultiLineComment = true;
				result.push('  '.repeat(currentIndent) + trimmedLine);
				if (trimmedLine.includes('*/')) {
					inMultiLineComment = false;
				}
				continue;
			}

			// 多行注释中
			if (inMultiLineComment) {
				result.push('  '.repeat(currentIndent) + trimmedLine);
				if (trimmedLine.includes('*/')) {
					inMultiLineComment = false;
				}
				continue;
			}

			// 处理代码
			line = line.trim();

			// 检查是否需要减少缩进的符号
			if (line.match(/^(\}|\\]|\)|else|finally|catch)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
			}

			// 添加当前缩进
			let indentedLine = '  '.repeat(currentIndent) + line;

			// 检查是否需要增加缩进的关键词和符号
			if (line.match(/({|class|interface|enum|if|else|elseif|for|while|do|switch|case|default|try|catch|finally)/)) {
				currentIndent++;
			}

			result.push(indentedLine);
		}

		return result.join('\n');
	}
}