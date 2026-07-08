import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class PHPPrettifyOperation extends BaseOperation {
	id = 'php-prettify';
	name = 'PHP美化';
	category = OperationCategory.BEAUTIFY;
	description = '美化和格式化PHP代码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入PHP代码' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const indent = (config.indent as number) || 4;
			return this.prettifyPHP(input, indent);
		} catch (error) {
			throw new Error(`PHP美化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private prettifyPHP(code: string, indentSize: number): string {
		const lines = code.split('\n');
		const result: string[] = [];
		const indent = ' '.repeat(indentSize);
		let currentIndent = 0;
		let inPHP = false;
		let inHeredoc = false;
		let inNowdoc = false;
		let heredocIdentifier = '';
		let inComment = false;
		let multiLineComment = false;

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();
			
			// 跳过空行但保留结构
			if (line.length === 0) {
				result.push('');
				continue;
			}

			// 检测PHP开始/结束标签
			if (line.startsWith('<?php')) {
				inPHP = true;
				result.push('<?php');
				continue;
			} else if (line.startsWith('?>')) {
				inPHP = false;
				result.push('?>');
				continue;
			}

			// 如果不在PHP块中，直接输出
			if (!inPHP) {
				result.push(line);
				continue;
			}

			// 处理Heredoc/Nowdoc
			if (inHeredoc || inNowdoc) {
				result.push('  '.repeat(currentIndent) + line);
				if (line === heredocIdentifier) {
					inHeredoc = false;
					inNowdoc = false;
					heredocIdentifier = '';
				}
				continue;
			}

			// 检查是否开始Heredoc/Nowdoc
			const heredocMatch = line.match(/<<<\s*(\w+)/);
			if (heredocMatch) {
				inHeredoc = true;
				heredocIdentifier = heredocMatch[1];
				result.push('  '.repeat(currentIndent) + line);
				continue;
			}

			// 处理注释
			if (line.startsWith('//') || line.startsWith('#')) {
				result.push('  '.repeat(currentIndent) + line);
				continue;
			}

			if (line.startsWith('/*')) {
				multiLineComment = true;
				result.push('  '.repeat(currentIndent) + line);
				if (line.includes('*/')) {
					multiLineComment = false;
				}
				continue;
			}

			if (multiLineComment) {
				result.push('  '.repeat(currentIndent) + line);
				if (line.includes('*/')) {
					multiLineComment = false;
				}
				continue;
			}

			// 移除现有缩进
			line = line.trim();

			// 处理减少缩进的关键词
			if (line.match(/^(\}|\\]|\)|else|elseif|endforeach|endfor|endforeach|endwhile|endswitch|enddeclare)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
			}

			// 添加当前缩进
			let indentedLine = '  '.repeat(currentIndent) + line;

			// 处理增加缩进的关键词和符号
			if (line.match(/({|function|class|interface|trait|if|else|elseif|foreach|for|while|switch|case|default|try|catch|finally)/)) {
				currentIndent++;
			}

			result.push(indentedLine);
		}

		return result.join('\n');
	}
}