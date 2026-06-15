import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import SHA1 from 'crypto-js/sha1';

export class SHA1Operation extends BaseOperation {
	id = 'sha1';
	name = 'SHA1 哈希';
	category = OperationCategory.HASH;
	description = '计算文本的 SHA1 哈希值';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const hash = SHA1(input);
			return hash.toString();
		} catch (error) {
			throw new Error(`SHA1 哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}