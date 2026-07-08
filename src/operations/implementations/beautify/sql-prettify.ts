import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class SQLPrettifyOperation extends BaseOperation {
	id = 'sql-prettify';
	name = 'SQL美化';
	category = OperationCategory.BEAUTIFY;
	description = '美化和格式化SQL代码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入SQL代码' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const indent = (config.indent as number) || 4;
			return this.prettifySQL(input, indent);
		} catch (error) {
			throw new Error(`SQL美化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private prettifySQL(code: string, indentSize: number): string {
		// 预处理：移除多余空白
		let processed = code.replace(/\s+/g, ' ').trim();
		
		// SQL关键字（大写）
		const keywords = [
			'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
			'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
			'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
			'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
			'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
			'CREATE', 'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER',
			'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT',
			'DISTINCT', 'AS', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
			'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
			'TRANSACTION', 'COMMIT', 'ROLLBACK', 'BEGIN'
		];

		// 按分号分割语句
		const statements = processed.split(';').filter(s => s.trim().length > 0);
		const formattedStatements: string[] = [];

		statements.forEach(statement => {
			formattedStatements.push(this.formatStatement(statement.trim(), keywords, indentSize));
		});

		return formattedStatements.join(';\n\n') + (statements.length > 0 ? ';' : '');
	}

	private formatStatement(statement: string, keywords: string[], indentSize: number): string {
		const result: string[] = [];
		let currentIndent = 0;
		const indent = ' '.repeat(indentSize);

		// 在关键字前后添加换行
		let processed = statement;
		
		keywords.forEach(keyword => {
			// 关键字前添加换行（如果在行首则不添加）
			processed = processed.replace(new RegExp(`\\s+${keyword}`, 'gi'), match => {
				return `\n${keyword}`;
			});
		});

		// 处理括号和逗号
		processed = processed
			.replace(/\(/g, ' (\n')
			.replace(/\)/g, '\n)')
			.replace(/,/g, ',\n');

		// 按行分割
		const lines = processed.split('\n').map(line => line.trim()).filter(line => line.length > 0);

		let inParentheses = false;

		lines.forEach(line => {
			// 检查括号
			if (line.includes('(')) {
				inParentheses = true;
				result.push('  '.repeat(currentIndent) + line.replace('(', '('));
				currentIndent++;
				return;
			}

			if (line.includes(')')) {
				currentIndent = Math.max(0, currentIndent - 1);
				result.push('  '.repeat(currentIndent) + line.replace(')', ')'));
				inParentheses = false;
				return;
			}

			// 检查是否是关键字（大写）
			const upperLine = line.toUpperCase().replace(/\([^)]*\)/g, ''); // 移除括号内容进行检查
			
			// 减少缩进的情况
			if (upperLine.match(/^(END|ELSE|THEN)/)) {
				currentIndent = Math.max(0, currentIndent - 1);
			}

			// 添加当前行
			result.push('  '.repeat(currentIndent) + line);

			// 增加缩进的关键字
			if (upperLine.match(/^(SELECT|FROM|WHERE|CASE|WHEN|THEN)/) && !inParentheses) {
				currentIndent++;
			}
		});

		return result.join('\n');
	}
}