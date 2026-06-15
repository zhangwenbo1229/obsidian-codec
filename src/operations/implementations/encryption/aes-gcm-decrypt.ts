import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import { WebCryptoAdapter } from '../../../crypto/web-crypto-adapter';
import { parseInputByKeyFormatForWebCrypto, parseInputByIVFormatForWebCrypto } from './format-utils';

interface AESGCMDecryptConfig {
	key: string;
	keyFormat: 'hex' | 'raw' | 'base64';
	nonce: string;
	nonceFormat: 'hex' | 'raw' | 'base64';
	nonceLength: 12 | 16;
	inputFormat: 'hex' | 'raw' | 'base64';
}

export class AESGCMDecryptOperation extends BaseOperation {
	id = 'aes-gcm-decrypt';
	name = 'AES-GCM解密';
	category = OperationCategory.DECRYPTION;
	description = '使用AES-GCM认证加密算法对数据进行解密';

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const gcmConfig = config as AESGCMDecryptConfig;

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

		const ciphertext = parseInputByKeyFormatForWebCrypto(input, gcmConfig.inputFormat || 'hex');

		const decrypted = await WebCryptoAdapter.decryptGCM(ciphertext, key, nonce);

		if (!decrypted) {
			throw new Error('解密失败，请检查密钥和Nonce是否正确');
		}

		return decrypted;
	}

	protected validateInput(input: string): ValidationResult {
		if (!input || input.length === 0) {
			return { valid: false, error: '请输入需要解密的内容' };
		}
		return { valid: true };
	}

	getConfigUI(): string {
		return 'aes-gcm-decrypt';
	}
}