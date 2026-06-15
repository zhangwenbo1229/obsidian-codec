import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import * as CryptoJS from 'crypto-js';
import { parseInputByKeyFormat, parseInputByIVFormat, formatOutput } from './format-utils';

interface AESEncryptConfig {
	key: string;
	keyFormat: 'hex' | 'raw' | 'base64';
	iv: string;
	ivFormat: 'hex' | 'raw' | 'base64';
	mode: 'CBC' | 'ECB' | 'CTR';
	outputFormat: 'hex' | 'raw' | 'base64';
	padding: 'PKCS7' | 'ZeroPadding';
}

export class AESEncryptOperation extends BaseOperation {
	id = 'aes-encrypt';
	name = 'AES加密';
	category = OperationCategory.ENCRYPTION;
	description = '使用AES算法对数据进行加密';

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const aesConfig = config as AESEncryptConfig;

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

		const options: CryptoJS.CipherOption = {
			mode: this.getAESMode(aesConfig.mode),
			padding: aesConfig.padding === 'PKCS7' ? CryptoJS.pad.Pkcs7 : CryptoJS.pad.ZeroPadding
		};

		if (parsedIV !== undefined) {
			options.iv = parsedIV;
		}

		const encrypted = CryptoJS.AES.encrypt(input, parsedKey, options);
		return formatOutput(encrypted, aesConfig.outputFormat || 'hex');
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
			return { valid: false, error: '请输入需要加密的内容' };
		}
		return { valid: true };
	}

	getConfigUI(): string {
		return 'aes-encrypt';
	}
}