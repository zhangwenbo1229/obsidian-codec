import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import type { OperationConfig } from '../../../types';

export class XmlPrettifyOperation extends BaseOperation {
	id = 'xml-prettify';
	name = 'XML美化';
	category = OperationCategory.BEAUTIFY;
	description = '格式化XML数据';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || !input.trim()) {
			return { valid: false, error: '输入不能为空' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {

		try {
			const indent = (config.indent as number) || 2;
			const formatted = this.formatXml(input, indent);
			return formatted;
		} catch (error) {
			throw new Error(`XML格式化失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private formatXml(xml: string, indent: number): string {
		let formatted = '';
		const pad = ' '.repeat(indent);
		let depth = 0;

		const tokens = xml.match(/<[^>]+>|[^<]+/g) || [];

		for (const token of tokens) {
			if (token.match(/^<\//)) {
				depth = Math.max(0, depth - 1);
				formatted += pad.repeat(depth) + token.trim() + '\n';
			} else if (token.match(/^<[^/][^>]*[^/]>\s*$/)) {
				formatted += pad.repeat(depth) + token.trim() + '\n';
				depth++;
			} else {
				formatted += pad.repeat(depth) + token.trim() + '\n';
			}
		}

		return formatted.trim();
	}
}