import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import SHA256 from 'crypto-js/sha256';

export class SHA256Operation extends BaseOperation {
	id = 'sha256';
	name = 'SHA256 哈希';
	category = OperationCategory.HASH;
	description = '计算文本的 SHA256 哈希值';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const hash = SHA256(input);
			return hash.toString();
		} catch (error) {
			throw new Error(`SHA256 哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}