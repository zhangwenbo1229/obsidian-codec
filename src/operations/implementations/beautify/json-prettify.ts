import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import type { OperationConfig } from '../../../types';

export class JsonPrettifyOperation extends BaseOperation {
	id = 'json-prettify';
	name = 'JSON美化';
	category = OperationCategory.BEAUTIFY;
	description = '格式化JSON数据';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || !input.trim()) {
			return { valid: false, error: '输入不能为空' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {

		try {
			const parsed = JSON.parse(input);
			const indent = (config.indent as number) || 2;
			const sortKeys = (config.sortKeys as boolean) || false;

			if (sortKeys) {
				return JSON.stringify(parsed, this.sortObjectKeys, indent);
			}
			return JSON.stringify(parsed, null, indent);
		} catch (error) {
			throw new Error(`无效的JSON格式: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private sortObjectKeys(key: string, value: any): any {
		if (value instanceof Object && !(value instanceof Array)) {
			return Object.keys(value)
				.sort()
				.reduce((sorted: any, key) => {
					sorted[key] = value[key];
					return sorted;
				}, {});
		}
		return value;
	}
}