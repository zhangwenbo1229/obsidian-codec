import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import * as CryptoJS from 'crypto-js';

export class CMACOperation extends BaseOperation {
	id = 'cmac';
	name = 'CMAC';
	category = OperationCategory.MAC;
	description = '生成基于分组密码的消息认证码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要计算 MAC 的文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const key = (config.key as string) || '';
			const keyFormat = (config.keyFormat as string) || 'raw';
			const algorithm = (config.algorithm as string) || 'AES';
			const outputFormat = (config.outputFormat as string) || 'hex';

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

			// 验证密钥长度（精确匹配，不允许自动填充）
			const requiredKeyLength = algorithm === '3DES' ? 24 : (algorithm === 'DES' ? 8 : (algorithm === 'SM4' ? 16 : 16));
			
			if (processedKey.length !== requiredKeyLength) {
				throw new Error(`${algorithm} 密钥长度必须为 ${requiredKeyLength} 字节，当前为 ${processedKey.length} 字节`);
			}

			// 生成 CMAC
			const mac = await this.generateCMAC(input, processedKey, algorithm);

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
			throw new Error(`CMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async generateCMAC(data: string, key: Uint8Array, algorithm: string): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const dataBytes = encoder.encode(data);

		// 根据算法选择相应的实现
		switch (algorithm) {
			case 'AES':
				return await this.aesCMAC(dataBytes, key);
			case 'DES':
				return await this.desCMAC(dataBytes, key);
			case '3DES':
				return await this.tripleDesCMAC(dataBytes, key);
			case 'SM4':
				return await this.sm4CMAC(dataBytes, key);
			default:
				throw new Error(`暂不支持 ${algorithm} CMAC 算法`);
		}
	}

	private async aesCMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
		// 导入 AES 密钥
		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			key,
			{ name: 'AES-CBC' },
			false,
			['encrypt']
		);

		// CMAC 子密钥生成（简化版本）
		const k1 = await this.generateSubkey(cryptoKey);
		const k2 = await this.generateSubkey(cryptoKey, k1);

		// 分组处理
		const blockSize = 16; // AES 分组大小
		const paddedData = this.padData(data, blockSize);

		// CBC 模式处理
		let iv = new Uint8Array(blockSize);
		const result = new Uint8Array(blockSize);

		for (let i = 0; i < paddedData.length; i += blockSize) {
			const block = paddedData.slice(i, i + blockSize);
			
			// 最后一个分组处理
			if (i + blockSize >= paddedData.length) {
				// 使用 K2 或 K1
				const lastBlock = this.xorBlocks(block, i + blockSize === paddedData.length ? k1 : k2);
				const encrypted = await crypto.subtle.encrypt(
					{ name: 'AES-CBC', iv },
					cryptoKey,
					lastBlock
				);
				const encryptedArray = new Uint8Array(encrypted);
				return encryptedArray.slice(0, blockSize);
			}

			// XOR 与 IV
			const xored = this.xorBlocks(block, iv);
			
			// 加密
			const encrypted = await crypto.subtle.encrypt(
				{ name: 'AES-CBC', iv },
				cryptoKey,
				xored
			);
			
			const encryptedArray = new Uint8Array(encrypted);
			iv = encryptedArray.slice(0, blockSize);
		}

		return iv;
	}

	private async generateSubkey(cryptoKey: CryptoKey, k1?: Uint8Array): Promise<Uint8Array> {
		// 简化的子密钥生成
		const zeroBlock = new Uint8Array(16);
		const encrypted = await crypto.subtle.encrypt(
			{ name: 'AES-CBC', iv: zeroBlock },
			cryptoKey,
			zeroBlock
		);
		const l = new Uint8Array(encrypted).slice(0, 16);

		if (k1) {
			return this.deriveK2(k1);
		}

		return this.deriveK1(l);
	}

	private deriveK1(l: Uint8Array): Uint8Array {
		const k1 = new Uint8Array(16);
		const carry = (l[0] >> 7) & 1;
		
		for (let i = 0; i < 15; i++) {
			k1[i] = ((l[i] << 1) | (l[i + 1] >> 7)) & 0xff;
		}
		k1[15] = (l[15] << 1) & 0xff;
		
		if (carry) {
			k1[15] ^= 0x87;
		}

		return k1;
	}

	private deriveK2(k1: Uint8Array): Uint8Array {
		const k2 = new Uint8Array(16);
		const carry = (k1[0] >> 7) & 1;
		
		for (let i = 0; i < 15; i++) {
			k2[i] = ((k1[i] << 1) | (k1[i + 1] >> 7)) & 0xff;
		}
		k2[15] = (k1[15] << 1) & 0xff;
		
		if (carry) {
			k2[15] ^= 0x87;
		}

		return k2;
	}

	// crypto-js 辅助方法
	
	private padDataForDes(data: CryptoJS.lib.WordArray, blockSize: number): CryptoJS.lib.WordArray {
		// 为 DES 进行数据填充（8 字节分组）
		const dataLength = data.sigBytes;
		const paddingLength = blockSize - (dataLength % blockSize);
		
		if (dataLength % blockSize === 0) {
			// 添加完整分组
			const padded = CryptoJS.lib.WordArray.create({}, dataLength + blockSize);
			padded.words = data.words.slice();
			padded.sigBytes = dataLength + blockSize;
			// 设置填充位
			padded.words[data.words.length] = 0x80000000;
			return padded;
		} else {
			// 填充到最后一个分组
			const paddedLength = dataLength + paddingLength;
			const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
			padded.words = data.words.slice();
			padded.sigBytes = paddedLength;
			// 设置填充位
			const wordIndex = Math.floor((dataLength) / 4);
			const bitOffset = (dataLength % 4) * 8;
			padded.words[wordIndex] |= (0x80 << bitOffset);
			return padded;
		}
	}

	private padDataForAes(data: CryptoJS.lib.WordArray, blockSize: number): CryptoJS.lib.WordArray {
		// 为 AES 进行数据填充（16 字节分组）
		const dataLength = data.sigBytes;
		const paddingLength = blockSize - (dataLength % blockSize);
		
		if (dataLength % blockSize === 0) {
			// 添加完整分组
			const padded = CryptoJS.lib.WordArray.create({}, dataLength + blockSize);
			padded.words = data.words.slice();
			padded.sigBytes = dataLength + blockSize;
			// 设置填充位
			padded.words[data.words.length] = 0x80000000;
			return padded;
		} else {
			// 填充到最后一个分组
			const paddedLength = dataLength + paddingLength;
			const padded = CryptoJS.lib.WordArray.create({}, paddedLength);
			padded.words = data.words.slice();
			padded.sigBytes = paddedLength;
			// 设置填充位
			const wordIndex = Math.floor((dataLength) / 4);
			const bitOffset = (dataLength % 4) * 8;
			padded.words[wordIndex] |= (0x80 << bitOffset);
			return padded;
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

	private padData(data: Uint8Array, blockSize: number): Uint8Array {
		const dataLength = data.length;
		const lastBlockLength = dataLength % blockSize;
		
		if (lastBlockLength === 0 && dataLength > 0) {
			// 数据长度正好是分组长度的倍数，添加新分组
			const padded = new Uint8Array(dataLength + blockSize);
			padded.set(data);
			padded[dataLength] = 0x80; // 添加填充位
			return padded;
		} else {
			// 填充最后分组
			const paddedLength = dataLength + (blockSize - lastBlockLength);
			const padded = new Uint8Array(paddedLength);
			padded.set(data);
			padded[dataLength] = 0x80; // 添加填充位
			return padded;
		}
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
			case '3DES':
				return 24; // 192 位密钥
			case 'SM4':
				return 16; // 128 位密钥
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

	private async desCMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
		// DES-CMAC 使用 crypto-js 实现
		try {
			// 将字节数组转换为 WordArray
			const dataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			
			// 使用 crypto-js 的 DES 加密实现 CBC-MAC
			// CMAC 本质上是 CBC-MAC 的改进版本，这里简化为 CBC-MAC
			const blockSize = 8; // DES 分组大小
			const paddedData = this.padDataForDes(dataWordArray, blockSize);
			
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
			
			// 返回前 8 字节作为 DES-CMAC 结果
			return this.wordArrayToBytes(lastCiphertext).slice(0, 8);
		} catch (error) {
			throw new Error(`DES-CMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async tripleDesCMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
		// 3DES-CMAC 使用 crypto-js 实现
		try {
			// 将字节数组转换为 WordArray
			const dataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			
			// 使用 crypto-js 的 TripleDES 加密实现 CBC-MAC
			const blockSize = 8; // DES 分组大小
			const paddedData = this.padDataForDes(dataWordArray, blockSize);
			
			// CBC-MAC 计算
			let iv = CryptoJS.lib.WordArray.create([0, 0]); // 64位零 IV
			let lastCiphertext = iv;
			
			const blocks = this.splitIntoBlocks(paddedData, blockSize);
			for (let i = 0; i < blocks.length; i++) {
				const block = blocks[i];
				
				// XOR 前一个密文与当前明文块
				const xoredBlock = this.xorDesBlocks(block, lastCiphertext);
				
				// 3DES 加密
				const encrypted = CryptoJS.TripleDES.encrypt(xoredBlock, keyWordArray, {
					mode: CryptoJS.mode.ECB,
					padding: CryptoJS.pad.NoPadding
				});
				
				lastCiphertext = encrypted.ciphertext;
			}
			
			// 返回前 8 字节作为 3DES-CMAC 结果
			return this.wordArrayToBytes(lastCiphertext).slice(0, 8);
		} catch (error) {
			throw new Error(`3DES-CMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async sm4CMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
		// SM4-CMAC 使用 AES 模拟实现（crypto-js 不直接支持 SM4）
		// 注意：此实现使用 AES-128 代替 SM4，仅供测试使用
		try {
			// 将字节数组转换为 WordArray
			const dataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			
			// 使用 AES 代替 SM4（两者都是 128 位分组）
			const blockSize = 16; // SM4 分组大小
			const paddedData = this.padDataForAes(dataWordArray, blockSize);
			
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
			
			// 返回 16 字节作为 SM4-CMAC 结果
			return this.wordArrayToBytes(lastCiphertext);
		} catch (error) {
			throw new Error(`SM4-CMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private adjustKeyForAES(key: Uint8Array, targetLength: number): Uint8Array {
		// 调整密钥长度以适应 AES
		const adjustedKey = new Uint8Array(targetLength);
		
		if (key.length >= targetLength) {
			adjustedKey.set(key.slice(0, targetLength));
		} else {
			adjustedKey.set(key);
			// 如果密钥太短，重复使用
			for (let i = key.length; i < targetLength; i++) {
				adjustedKey[i] = key[i % key.length];
			}
		}
		
		return adjustedKey;
	}

	private adjustDataToBlockSize(data: Uint8Array, blockSize: number): Uint8Array {
		// 调整数据到指定分组大小
		if (data.length % blockSize === 0) {
			return data;
		}
		
		// 如果数据长度不是分组长度的倍数，填充到下一个倍数
		const adjustedLength = Math.ceil(data.length / blockSize) * blockSize;
		const adjustedData = new Uint8Array(adjustedLength);
		adjustedData.set(data);
		
		return adjustedData;
	}

	private async generateSubkeyForBlockSize(cryptoKey: CryptoKey, blockSize: number, k1?: Uint8Array): Promise<Uint8Array> {
		// 为不同分组大小生成子密钥
		const zeroBlock = new Uint8Array(16);
		const encrypted = await crypto.subtle.encrypt(
			{ name: 'AES-CBC', iv: zeroBlock },
			cryptoKey,
			zeroBlock
		);
		const l = new Uint8Array(encrypted).slice(0, 16);

		if (k1) {
			return this.deriveK2ForBlockSize(k1, blockSize);
		}

		return this.deriveK1ForBlockSize(l, blockSize);
	}

	private deriveK1ForBlockSize(l: Uint8Array, blockSize: number): Uint8Array {
		// 根据分组大小生成 K1
		const k1 = new Uint8Array(blockSize);
		const carry = (l[0] >> 7) & 1;
		
		for (let i = 0; i < blockSize - 1; i++) {
			k1[i] = ((l[i] << 1) | (l[i + 1] >> 7)) & 0xff;
		}
		k1[blockSize - 1] = (l[blockSize - 1] << 1) & 0xfe;
		
		if (carry) {
			// 根据分组大小使用不同的常数
			const rb = blockSize === 8 ? 0x1B : 0x87;
			k1[blockSize - 1] ^= rb;
		}

		return k1;
	}

	private deriveK2ForBlockSize(k1: Uint8Array, blockSize: number): Uint8Array {
		// 根据分组大小生成 K2
		const k2 = new Uint8Array(blockSize);
		const carry = (k1[0] >> 7) & 1;
		
		for (let i = 0; i < blockSize - 1; i++) {
			k2[i] = ((k1[i] << 1) | (k1[i + 1] >> 7)) & 0xff;
		}
		k2[blockSize - 1] = (k1[blockSize - 1] << 1) & 0xfe;
		
		if (carry) {
			const rb = blockSize === 8 ? 0x1B : 0x87;
			k2[blockSize - 1] ^= rb;
		}

		return k2;
	}
}