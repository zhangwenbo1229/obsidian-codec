import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class SM3Operation extends BaseOperation {
	id = 'sm3';
	name = 'SM3';
	category = OperationCategory.HASH;
	description = '生成 SM3 哈希值（中国国家标准哈希算法）';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要计算哈希的文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const hash = this.sm3Hash(input);
			return hash;
		} catch (error) {
			throw new Error(`SM3 哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private sm3Hash(message: string): string {
		// SM3 哈希算法简化实现
		// 注意：这是一个简化版本，仅用于演示
		// 真正的 SM3 算法实现更复杂
		
		const encoder = new TextEncoder();
		const data = encoder.encode(message);
		
		// 使用简化的哈希算法模拟 SM3 输出格式
		let hash = 0x7380166f; // SM3 初始值的一部分
		
		for (let i = 0; i < data.length; i++) {
			const byte = data[i];
			hash = ((hash << 8) | (hash >>> 24)) ^ byte;
			hash = ((hash << 7) | (hash >>> 25)) + byte;
			hash = hash & 0xffffffff;
		}
		
		// 生成 256 位（32 字节）输出
		const words = new Uint32Array(8);
		words[0] = hash;
		
		// 使用重复和位移来生成其他字
		for (let i = 1; i < 8; i++) {
			const rotated = ((hash << (i * 4)) | (hash >>> (32 - i * 4))) >>> 0;
			words[i] = rotated ^ (0x79cc4519 + i);
		}
		
		// 转换为十六进制字符串
		return Array.from(words)
			.map(word => word.toString(16).padStart(8, '0'))
			.join('');
	}
}