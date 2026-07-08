import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class UUIDGenerateOperation extends BaseOperation {
	id = 'uuid-generate';
	name = 'UUID生成';
	category = OperationCategory.OTHER;
	description = '生成随机UUID（通用唯一标识符）';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		// UUID生成不依赖输入，总是有效
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			// 生成UUID v4（随机UUID）
			return this.generateUUID4();
		} catch (error) {
			throw new Error(`UUID生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private generateUUID4(): string {
		// 生成UUID v4格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		// 其中x是随机十六进制数字，y是8、9、A或B
		const bytes = new Uint8Array(16);
		
		// 使用加密安全的随机数生成器
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			crypto.getRandomValues(bytes);
		} else {
			// 回退到Math.random（不安全，但保证兼容性）
			for (let i = 0; i < 16; i++) {
				bytes[i] = Math.floor(Math.random() * 256);
			}
		}
		
		// 设置版本和变体位
		bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本4 (随机UUID)
		bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体 (RFC4122)
		
		// 转换为十六进制字符串
		const hex = Array.from(bytes)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
		
		// 格式化为UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		return [
			hex.substring(0, 8),
			hex.substring(8, 12),
			hex.substring(12, 16),
			hex.substring(16, 20),
			hex.substring(20, 32)
		].join('-');
	}
}