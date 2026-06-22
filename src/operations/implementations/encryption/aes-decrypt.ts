import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import * as CryptoJS from 'crypto-js';
import { parseInputByKeyFormat, parseInputByIVFormat } from './format-utils';

interface AESDecryptConfig {
	key: string;
	keyFormat: 'hex' | 'raw' | 'base64';
	iv: string;
	ivFormat: 'hex' | 'raw' | 'base64';
	mode: 'CBC' | 'ECB' | 'CTR';
	inputFormat: 'hex' | 'raw' | 'base64';
	padding: 'PKCS7' | 'ZeroPadding';
}

export class AESDecryptOperation extends BaseOperation {
	id = 'aes-decrypt';
	name = 'AES解密';
	category = OperationCategory.DECRYPTION;
	description = '使用AES算法对数据进行解密';

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const aesConfig = config as unknown as AESDecryptConfig;

		if (!aesConfig.key || aesConfig.key.trim() === '') {
			throw new Error('请输入密钥(Key)');
		}

		const parsedKey = parseInputByKeyFormat(aesConfig.key, aesConfig.keyFormat || 'raw');

		let parsedIV: CryptoJS.lib.WordArray | undefined;
		if (aesConfig.mode !== 'ECB') {
			if (!aesConfig.iv || aesConfig.iv.trim() === '') {
				throw new Error('请输入初始化向量(IV)');
			}
			parsedIV = parseInputByIVFormat(aesConfig.iv, aesConfig.ivFormat || 'raw');
		}

		const ciphertext = parseInputByKeyFormat(input, aesConfig.inputFormat || 'hex');

		const options: Parameters<typeof CryptoJS.AES.decrypt>[2] = {
			mode: this.getAESMode(aesConfig.mode),
			padding: aesConfig.padding === 'PKCS7' ? CryptoJS.pad.Pkcs7 : CryptoJS.pad.ZeroPadding
		};

		if (parsedIV !== undefined) {
			options.iv = parsedIV;
		}

		const decrypted = CryptoJS.AES.decrypt(
			CryptoJS.lib.CipherParams.create({ ciphertext }),
			parsedKey,
			options
		);

		const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

		if (!decryptedText) {
			throw new Error('解密失败，请检查密钥和IV是否正确');
		}

		return decryptedText;
	}

	private getAESMode(mode: string): any {
		switch (mode) {
			case 'CBC': return CryptoJS.mode.CBC;
			case 'ECB': return CryptoJS.mode.ECB;
			case 'CTR': return CryptoJS.mode.CTR;
			default: return CryptoJS.mode.CBC;
		}
	}

	protected validateInput(input: string): ValidationResult {
		if (!input || input.length === 0) {
			return { valid: false, error: '请输入需要解密的内容' };
		}
		return { valid: true };
	}

	getConfigUI(): string {
		return 'aes-decrypt';
	}
}
