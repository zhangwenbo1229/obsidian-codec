import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ShellPrettifyOperation extends BaseOperation {
	id = 'shell-prettify';
	name = 'Shell美化';
	category = OperationCategory.BEAUTIFY;
	description = '美化和格式化Shell脚本代码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入Shell脚本代码' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const indent = (config.indent as number) || 4;
			return this.prettifyShell(input, indent);
		} catch (error) {
			throw new Error(`Shell美化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private prettifyShell(code: string, indentSize: number): string {
		const lines = code.split('\n');
		const result: string[] = [];
		let currentIndent = 0;
		let inHereDoc = false;
		let hereDocDelimiter = '';
		let inMultiLineCommand = false;

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			const trimmed = line.trim();

			// 跳过空行但保留结构
			if (trimmed.length === 0) {
				result.push('');
				continue;
			}

			// 处理HereDocument
			if (trimmed.match(/<<\s*(\w+)/)) {
				const match = trimmed.match(/<<\s*(\w+)/);
				if (match) {
					inHereDoc = true;
					hereDocDelimiter = match[1];
					result.push(' '.repeat(currentIndent * indentSize) + trimmed);
					continue;
				}
			}

			if (inHereDoc) {
				result.push(trimmed); // HereDocument内容不缩进
				if (trimmed === hereDocDelimiter) {
					inHereDoc = false;
					hereDocDelimiter = '';
				}
				continue;
			}

			// 处理注释
			if (trimmed.startsWith('#')) {
				result.push(' '.repeat(currentIndent * indentSize) + trimmed);
				continue;
			}

			// 处理多行命令（以反斜杠结尾）
			if (trimmed.endsWith('\\')) {
				result.push(' '.repeat(currentIndent * indentSize) + trimmed);
				continue;
			}

			// 处理case语句
			if (trimmed.startsWith('case') || trimmed.startsWith('esac')) {
				result.push(' '.repeat(currentIndent * indentSize) + trimmed);
				if (trimmed.startsWith('case')) {
					currentIndent++;
				}
				continue;
			}

			if (trimmed.match(/^\s*\+\)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
				result.push(' '.repeat(currentIndent * indentSize) + trimmed);
				currentIndent++;
				continue;
			}

			if (trimmed.match(/^\s*;;/)) {
				currentIndent = Math.max(0, currentIndent - 1);
				result.push(' '.repeat(currentIndent * indentSize) + trimmed);
				continue;
			}

			// 检查需要减少缩进的关键词
			if (trimmed.match(/^(done|fi|else|elif|esac)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
			}

			// 添加当前缩进
			result.push(' '.repeat(currentIndent * indentSize) + trimmed);

			// 检查需要增加缩进的情况
			if (trimmed.match(/^(if|then|else|elif|fi|for|while|do|done|case|esac|function|select|until)/)) {
				if (trimmed.match(/^(if|for|while|case|function|select|until)/)) {
					currentIndent++;
				}
			}

			// 检查以then/do开始的行
			if (trimmed.startsWith('then') || trimmed.startsWith('do')) {
				// 已经在前面处理了缩进，这里不重复增加
			}

			// 检查控制操作符后的换行
			if (trimmed.endsWith('|') || trimmed.endsWith('&&') || trimmed.endsWith('||')) {
				// 下一行需要额外缩进
				continue;
			}
		}

		return result.join('\n');
	}
}