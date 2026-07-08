import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import SHA256 from 'crypto-js/sha256';
import SHA512 from 'crypto-js/sha512';
import MD5 from 'crypto-js/md5';

export class FileHashOperation extends BaseOperation {
	id = 'file-hash';
	name = '文件哈希计算';
	category = OperationCategory.HASH;
	description = '计算文件内容的哈希值，支持文本和二进制文件';

	// 配置选项
	private defaultAlgorithm = 'SHA256';
	private defaultInputType = 'auto'; // auto, text, binary

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请选择文件或输入要计算哈希的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const algorithm = (config.algorithm as string) || this.defaultAlgorithm;
			const inputType = (config.inputType as string) || this.defaultInputType;
			const filePath = (config.filePath as string) || '';

			// 如果有文件路径，读取文件内容
			if (filePath && inputType !== 'text') {
				return await this.calculateFileHash(filePath, algorithm);
			}

			// 否则计算文本哈希
			return this.calculateTextHash(input, algorithm);
		} catch (error) {
			throw new Error(`文件哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private calculateTextHash(text: string, algorithm: string): string {
		switch (algorithm) {
			case 'MD5':
				return MD5(text).toString();
			case 'SHA256':
				return SHA256(text).toString();
			case 'SHA512':
				return SHA512(text).toString();
			default:
				throw new Error(`不支持的哈希算法: ${algorithm}`);
		}
	}

	private async calculateFileHash(filePath: string, algorithm: string): Promise<string> {
		// 这里需要实现文件读取和哈希计算
		// 注意：在Obsidian插件环境中，文件访问受限制
		// 可能需要使用Obsidian的API或通过用户选择文件
		throw new Error('文件哈希计算需要通过文件选择器实现，请使用UI中的文件选择功能');
	}
}