import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import MD5 from 'crypto-js/md5';

export class MD5Operation extends BaseOperation {
	id = 'md5';
	name = 'MD5 哈希';
	category = OperationCategory.HASH;
	description = '计算文本的 MD5 哈希值';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const hash = MD5(input);
			return hash.toString();
		} catch (error) {
			throw new Error(`MD5 哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}