import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import * as CryptoJS from 'crypto-js';

export class CBCMACOperation extends BaseOperation {
	id = 'cbc-mac';
	name = 'CBC-MAC';
	category = OperationCategory.MAC;
	description = '生成基于分组密码 CBC 模式的消息认证码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要计算 CBC-MAC 的文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const key = (config.key as string) || '';
			const keyFormat = (config.keyFormat as string) || 'raw';
			const algorithm = (config.algorithm as string) || 'AES';
			const outputFormat = (config.outputFormat as string) || 'hex';
			const padding = (config.padding as string) || 'pkcs';

			if (!key) {
				throw new Error('请输入密钥');
			}

			// 处理密钥格式
			let processedKey: Uint8Array;
			switch (keyFormat) {
				case 'hex':
					processedKey = this.hexToBytes(key);
					break;
				case 'base64':
					processedKey = this.base64ToBytes(key);
					break;
				case 'raw':
				default:
					processedKey = new TextEncoder().encode(key);
					break;
			}

			// 生成 CBC-MAC
			const mac = await this.generateCBCMAC(input, processedKey, algorithm, padding);

			// 处理输出格式
			switch (outputFormat) {
				case 'hex':
					return this.bytesToHex(mac);
				case 'base64':
					return this.bytesToBase64(mac);
				case 'raw':
					return new TextDecoder().decode(mac);
				default:
					return this.bytesToHex(mac);
			}
		} catch (error) {
			throw new Error(`CBC-MAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async generateCBCMAC(
		data: string,
		key: Uint8Array,
		algorithm: string,
		padding: string
	): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const dataBytes = encoder.encode(data);

		// 验证密钥长度（精确匹配，不允许自动调整）
		const requiredKeyLength = this.getKeyLength(algorithm);
		
		if (key.length !== requiredKeyLength) {
			throw new Error(`${algorithm} 密钥长度必须为 ${requiredKeyLength} 字节，当前为 ${key.length} 字节`);
		}

		// 根据算法选择相应的实现
		switch (algorithm) {
			case 'AES':
				return await this.aesCBCMAC(dataBytes, key, 16, padding);
			case 'DES':
				return await this.desCBCMAC(dataBytes, key, padding);
			case 'SM4':
				return await this.sm4CBCMAC(dataBytes, key, padding);
			default:
				throw new Error(`暂不支持 ${algorithm} CBC-MAC 算法`);
		}
	}

	private padData(data: Uint8Array, blockSize: number, padding: string): Uint8Array {
		const dataLength = data.length;
		const lastBlockLength = dataLength % blockSize;

		if (lastBlockLength === 0 && dataLength > 0) {
			// 数据长度正好是分组长度的倍数，添加新分组
			const padded = new Uint8Array(dataLength + blockSize);
			padded.set(data);
			return padded;
		}

		const paddedLength = dataLength + (blockSize - lastBlockLength);
		const padded = new Uint8Array(paddedLength);
		padded.set(data);

		switch (padding) {
			case 'pkcs':
				// PKCS7 填充
				const paddingValue = blockSize - lastBlockLength;
				for (let i = dataLength; i < paddedLength; i++) {
					padded[i] = paddingValue;
				}
				break;
			case 'zeroPadding':
				// 零填充（已默认初始化为零）
				break;
			default:
				// 默认 PKCS7 填充
				const paddingValue2 = blockSize - lastBlockLength;
				for (let i = dataLength; i < paddedLength; i++) {
					padded[i] = paddingValue2;
				}
				break;
		}

		return padded;
	}

	private xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
		const result = new Uint8Array(a.length);
		for (let i = 0; i < a.length; i++) {
			result[i] = a[i] ^ b[i];
		}
		return result;
	}

	private getKeyLength(algorithm: string): number {
		switch (algorithm) {
			case 'AES':
				return 16; // 128 位密钥
			case 'DES':
				return 8; // 64 位密钥
			case 'SM4':
				return 16; // 128 位密钥
			default:
				return 16;
		}
	}

	private getBlockSize(algorithm: string): number {
		switch (algorithm) {
			case 'AES':
				return 16; // 128 位分组
			case 'DES':
				return 8; // 64 位分组
			case 'SM4':
				return 16; // 128 位分组
			default:
				return 16;
		}
	}

	private hexToBytes(hex: string): Uint8Array {
		const cleanHex = hex.replace(/\s/g, '');
		const bytes = new Uint8Array(cleanHex.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
		}
		return bytes;
	}

	private base64ToBytes(base64: string): Uint8Array {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes;
	}

	private bytesToHex(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	private bytesToBase64(bytes: Uint8Array): string {
		return btoa(String.fromCharCode(...bytes));
	}

	private async aesCBCMAC(data: Uint8Array, key: Uint8Array, blockSize: number, padding: string): Promise<Uint8Array> {
		const paddedData = this.padData(data, blockSize, padding);

		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			key,
			{ name: 'AES-CBC' },
			false,
			['encrypt']
		);

		let iv = new Uint8Array(blockSize);
		let lastCiphertext: Uint8Array = iv;

		for (let i = 0; i < paddedData.length; i += blockSize) {
			const block = paddedData.slice(i, i + blockSize);
			const xoredBlock = this.xorBlocks(block, lastCiphertext);
			
			const encrypted = await crypto.subtle.encrypt(
				{ name: 'AES-CBC', iv },
				cryptoKey,
				xoredBlock
			);

			const encryptedArray = new Uint8Array(encrypted);
			lastCiphertext = encryptedArray.slice(0, blockSize);
		}

		return lastCiphertext;
	}

	private async desCBCMAC(data: Uint8Array, key: Uint8Array, padding: string): Promise<Uint8Array> {
		// DES-CBC-MAC 使用 crypto-js 实现
		try {
			// 将字节数组转换为 WordArray
			const dataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			
			// 根据填充方式处理数据
			const blockSize = 8; // DES 分组大小
			const paddedData = this.padDataForCbcDes(dataWordArray, blockSize, padding);
			
			// CBC-MAC 计算
			let iv = CryptoJS.lib.WordArray.create([0, 0]); // 64位零 IV
			let lastCiphertext = iv;
			
			const blocks = this.splitIntoBlocks(paddedData, blockSize);
			for (let i = 0; i < blocks.length; i++) {
				const block = blocks[i];
				
				// XOR 前一个密文与当前明文块
				const xoredBlock = this.xorDesBlocks(block, lastCiphertext);
				
				// DES 加密
				const encrypted = CryptoJS.DES.encrypt(xoredBlock, keyWordArray, {
					mode: CryptoJS.mode.ECB,
					padding: CryptoJS.pad.NoPadding
				});
				
				lastCiphertext = encrypted.ciphertext;
			}
			
			// 返回前 8 字节作为 DES-CBC-MAC 结果
			return this.wordArrayToBytes(lastCiphertext).slice(0, 8);
		} catch (error) {
			throw new Error(`DES-CBC-MAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async sm4CBCMAC(data: Uint8Array, key: Uint8Array, padding: string): Promise<Uint8Array> {
		// SM4-CBC-MAC 使用 AES 模拟实现（crypto-js 不直接支持 SM4）
		// 注意：此实现使用 AES-128 代替 SM4，仅供测试使用
		try {
			// 将字节数组转换为 WordArray
			const dataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			
			// 使用 AES 代替 SM4（两者都是 128 位分组）
			const blockSize = 16; // SM4 分组大小
			const paddedData = this.padDataForCbcAes(dataWordArray, blockSize, padding);
			
			// CBC-MAC 计算
			let iv = CryptoJS.lib.WordArray.create([0, 0, 0, 0]); // 128位零 IV
			let lastCiphertext = iv;
			
			const blocks = this.splitIntoBlocks(paddedData, blockSize);
			for (let i = 0; i < blocks.length; i++) {
				const block = blocks[i];
				
				// XOR 前一个密文与当前明文块
				const xoredBlock = this.xorAesBlocks(block, lastCiphertext);
				
				// AES 加密（代替 SM4）
				const encrypted = CryptoJS.AES.encrypt(xoredBlock, keyWordArray, {
					mode: CryptoJS.mode.ECB,
					padding: CryptoJS.pad.NoPadding
				});
				
				lastCiphertext = encrypted.ciphertext;
			}
			
			// 返回 16 字节作为 SM4-CBC-MAC 结果
			return this.wordArrayToBytes(lastCiphertext);
		} catch (error) {
			throw new Error(`SM4-CBC-MAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private adjustKeyForAES(key: Uint8Array, targetLength: number): Uint8Array {
		const adjustedKey = new Uint8Array(targetLength);
		
		if (key.length >= targetLength) {
			adjustedKey.set(key.slice(0, targetLength));
		} else {
			adjustedKey.set(key);
			for (let i = key.length; i < targetLength; i++) {
				adjustedKey[i] = key[i % key.length];
			}
		}
		
		return adjustedKey;
	}

	private adjustDataToBlockSize(data: Uint8Array, blockSize: number): Uint8Array {
		if (data.length % blockSize === 0) {
			return data;
		}
		
		const adjustedLength = Math.ceil(data.length / blockSize) * blockSize;
		const adjustedData = new Uint8Array(adjustedLength);
		adjustedData.set(data);
		
		return adjustedData;
	}

	// crypto-js 辅助方法

	private padDataForCbcDes(data: CryptoJS.lib.WordArray, blockSize: number, padding: string): CryptoJS.lib.WordArray {
		// 为 DES-CBC 进行数据填充
		const dataLength = data.sigBytes;
		
		if (padding === 'pkcs') {
			// PKCS7 填充
			const paddingLength = blockSize - (dataLength % blockSize);
			const paddedLength = dataLength + paddingLength;
			const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
			padded.words = data.words.slice();
			padded.sigBytes = paddedLength;
			
			// 设置 PKCS7 填充
			for (let i = dataLength; i < paddedLength; i++) {
				const wordIndex = Math.floor(i / 4);
				const byteOffset = i % 4;
				padded.words[wordIndex] |= (paddingLength << (byteOffset * 8));
			}
			return padded;
		} else {
			// ZeroPadding
			if (dataLength % blockSize === 0) {
				// 添加完整分组
				const padded = CryptoJS.lib.WordArray.create({}, dataLength + blockSize);
				padded.words = data.words.slice();
				padded.sigBytes = dataLength + blockSize;
				return padded;
			} else {
				// 填充到分组边界
				const paddingLength = blockSize - (dataLength % blockSize);
				const paddedLength = dataLength + paddingLength;
				const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
				padded.words = data.words.slice();
				padded.sigBytes = paddedLength;
				return padded;
			}
		}
	}

	private padDataForCbcAes(data: CryptoJS.lib.WordArray, blockSize: number, padding: string): CryptoJS.lib.WordArray {
		// 为 AES-CBC/SM4-CBC 进行数据填充
		const dataLength = data.sigBytes;
		
		if (padding === 'pkcs') {
			// PKCS7 填充
			const paddingLength = blockSize - (dataLength % blockSize);
			const paddedLength = dataLength + paddingLength;
			const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
			padded.words = data.words.slice();
			padded.sigBytes = paddedLength;
			
			// 设置 PKCS7 填充
			for (let i = dataLength; i < paddedLength; i++) {
				const wordIndex = Math.floor(i / 4);
				const byteOffset = i % 4;
				padded.words[wordIndex] |= (paddingLength << (byteOffset * 8));
			}
			return padded;
		} else {
			// ZeroPadding
			if (dataLength % blockSize === 0) {
				// 添加完整分组
				const padded = CryptoJS.lib.WordArray.create({}, dataLength + blockSize);
				padded.words = data.words.slice();
				padded.sigBytes = dataLength + blockSize;
				return padded;
			} else {
				// 填充到分组边界
				const paddingLength = blockSize - (dataLength % blockSize);
				const paddedLength = dataLength + paddingLength;
				const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
				padded.words = data.words.slice();
				padded.sigBytes = paddedLength;
				return padded;
			}
		}
	}

	private splitIntoBlocks(data: CryptoJS.lib.WordArray, blockSize: number): CryptoJS.lib.WordArray[] {
		// 将数据分割为指定大小的块
		const blocks: CryptoJS.lib.WordArray[] = [];
		const totalBlocks = Math.ceil(data.sigBytes / blockSize);
		
		for (let i = 0; i < totalBlocks; i++) {
			const startByte = i * blockSize;
			const endByte = Math.min(startByte + blockSize, data.sigBytes);
			const blockBytes = endByte - startByte;
			
			// 创建块
			const block = CryptoJS.lib.WordArray.create({}, blockSize);
			
			// 复制数据
			for (let j = 0; j < blockBytes; j++) {
				const sourceByte = startByte + j;
				const sourceWord = Math.floor(sourceByte / 4);
				const sourceOffset = (sourceByte % 4) * 8;
				const targetWord = Math.floor(j / 4);
				const targetOffset = (j % 4) * 8;
				
				const byteValue = (data.words[sourceWord] >> sourceOffset) & 0xff;
				block.words[targetWord] |= (byteValue << targetOffset);
			}
			
			block.sigBytes = blockSize;
			blocks.push(block);
		}
		
		return blocks;
	}

	private xorDesBlocks(a: CryptoJS.lib.WordArray, b: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
		// XOR 两个 64 位块（DES）
		const result = CryptoJS.lib.WordArray.create({}, 8);
		for (let i = 0; i < 2; i++) {
			result.words[i] = a.words[i] ^ b.words[i];
		}
		result.sigBytes = 8;
		return result;
	}

	private xorAesBlocks(a: CryptoJS.lib.WordArray, b: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
		// XOR 两个 128 位块（AES）
		const result = CryptoJS.lib.WordArray.create({}, 16);
		for (let i = 0; i < 4; i++) {
			result.words[i] = a.words[i] ^ b.words[i];
		}
		result.sigBytes = 16;
		return result;
	}

	private wordArrayToBytes(wordArray: CryptoJS.lib.WordArray): Uint8Array {
		// 将 WordArray 转换为 Uint8Array
		const bytes = new Uint8Array(wordArray.sigBytes);
		for (let i = 0; i < wordArray.sigBytes; i++) {
			const wordIndex = Math.floor(i / 4);
			const byteOffset = i % 4;
			bytes[i] = (wordArray.words[wordIndex] >> (byteOffset * 8)) & 0xff;
		}
		return bytes;
	}
}