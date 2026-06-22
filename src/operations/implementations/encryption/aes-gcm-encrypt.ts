import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import { WebCryptoAdapter } from '../../../crypto/web-crypto-adapter';
import { parseInputByIVFormatForWebCrypto } from './format-utils';

interface AESGCMEncryptConfig {
	key: string;
	keyFormat: 'hex' | 'raw' | 'base64';
	nonce: string;
	nonceFormat: 'hex' | 'raw' | 'base64';
	nonceLength: 12 | 16;
	outputFormat: 'hex' | 'raw' | 'base64';
}

export class AESGCMEncryptOperation extends BaseOperation {
	id = 'aes-gcm-encrypt';
	name = 'AES-GCM加密';
	category = OperationCategory.ENCRYPTION;
	description = '使用AES-GCM认证加密算法对数据进行加密';

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const gcmConfig = config as unknown as AESGCMEncryptConfig;

		if (!gcmConfig.key || gcmConfig.key.trim() === '') {
			throw new Error('请输入密钥(Key)');
		}
		const key = await WebCryptoAdapter.importKey(
			gcmConfig.keyFormat || 'raw',
			gcmConfig.key
		);

		if (!gcmConfig.nonce || gcmConfig.nonce.trim() === '') {
			throw new Error('请输入Nonce/IV');
		}
		const nonce = parseInputByIVFormatForWebCrypto(gcmConfig.nonce, gcmConfig.nonceFormat || 'raw');

		const encrypted = await WebCryptoAdapter.encryptGCM(input, key, nonce);
		return this.formatOutput(encrypted, gcmConfig.outputFormat || 'hex');
	}

	private formatOutput(data: Uint8Array, format: string): string {
		switch (format) {
			case 'hex':
				return Array.from(data)
					.map(b => b.toString(16).padStart(2, '0'))
					.join('');
			case 'base64':
				return btoa(String.fromCharCode(...data));
			case 'raw':
				return new TextDecoder().decode(data);
			default:
				throw new Error(`不支持的输出格式: ${format}`);
		}
	}

	protected validateInput(input: string): ValidationResult {
		if (!input || input.length === 0) {
			return { valid: false, error: '请输入需要加密的内容' };
		}
		return { valid: true };
	}

	getConfigUI(): string {
		return 'aes-gcm-encrypt';
	}
}
