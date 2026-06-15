import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import SHA512 from 'crypto-js/sha512';

export class SHA512Operation extends BaseOperation {
	id = 'sha512';
	name = 'SHA512 哈希';
	category = OperationCategory.HASH;
	description = '计算文本的 SHA512 哈希值';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const hash = SHA512(input);
			return hash.toString();
		} catch (error) {
			throw new Error(`SHA512 哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}