import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class HMACOperation extends BaseOperation {
	id = 'hmac';
	name = 'HMAC';
	category = OperationCategory.MAC;
	description = '生成基于哈希函数的消息认证码';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入要计算 HMAC 的文本' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const key = (config.key as string) || '';
			const keyFormat = (config.keyFormat as string) || 'raw';
			const hashMethod = (config.hashMethod as string) || 'SHA-256';
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

			// 生成 HMAC
			const hmac = await this.generateHMAC(input, processedKey, hashMethod);

			// 处理输出格式
			switch (outputFormat) {
				case 'hex':
					return this.bytesToHex(hmac);
				case 'base64':
					return this.bytesToBase64(hmac);
				case 'raw':
					return new TextDecoder().decode(hmac);
				default:
					return this.bytesToHex(hmac);
			}
		} catch (error) {
			throw new Error(`HMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async generateHMAC(data: string, key: Uint8Array, hashMethod: string): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const dataBytes = encoder.encode(data);

		// 对于 MD5 和 SM3，使用自定义实现
		if (hashMethod === 'MD5' || hashMethod === 'SM3') {
			return await this.customHMAC(dataBytes, key, hashMethod);
		}

		// 将哈希方法转换为 Web Crypto API 格式
		const cryptoHashMethod = this.getCryptoHashMethod(hashMethod);
		
		try {
			// 使用 Web Crypto API 的 HMAC 功能
			const cryptoKey = await crypto.subtle.importKey(
				'raw',
				key,
				{ name: 'HMAC', hash: cryptoHashMethod },
				false,
				['sign']
			);

			// 签名数据
			const signature = await crypto.subtle.sign(
				{ name: 'HMAC' },
				cryptoKey,
				dataBytes
			);

			return new Uint8Array(signature);
		} catch (error) {
			throw new Error(`HMAC 计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async customHMAC(data: Uint8Array, key: Uint8Array, hashMethod: string): Promise<Uint8Array> {
		// 自定义 HMAC 实现用于 MD5 和 SM3
		const hashInfo = this.getHashInfo(hashMethod);
		const blockSize = hashInfo.blockSize;
		const outputSize = hashInfo.outputSize;

		// 密钥处理
		let processedKey = key;
		if (key.length > blockSize) {
			const hashBuffer = await this.computeHash(key, hashMethod);
			processedKey = new Uint8Array(hashBuffer);
		}

		// 密钥填充
		if (processedKey.length < blockSize) {
			const paddedKey = new Uint8Array(blockSize);
			paddedKey.set(processedKey);
			processedKey = paddedKey;
		}

		// 生成 ipad 和 opad
		const ipad = new Uint8Array(blockSize);
		const opad = new Uint8Array(blockSize);
		for (let i = 0; i < blockSize; i++) {
			ipad[i] = processedKey[i] ^ 0x36;
			opad[i] = processedKey[i] ^ 0x5c;
		}

		// 内层哈希: H(key ⊕ ipad || data)
		const innerData = new Uint8Array(ipad.length + data.length);
		innerData.set(ipad);
		innerData.set(data, ipad.length);
		const innerHash = await this.computeHash(innerData, hashMethod);

		// 外层哈希: H(key ⊕ opad || innerHash)
		const outerData = new Uint8Array(opad.length + innerHash.length);
		outerData.set(opad);
		outerData.set(innerHash, opad.length);
		const finalHash = await this.computeHash(outerData, hashMethod);

		return finalHash;
	}

	private async computeHash(data: Uint8Array, hashMethod: string): Promise<Uint8Array> {
		if (hashMethod === 'MD5') {
			return this.md5Hash(data);
		} else if (hashMethod === 'SM3') {
			return this.sm3Hash(data);
		}
		throw new Error(`不支持的哈希方法: ${hashMethod}`);
	}

	private getCryptoHashMethod(hashMethod: string): string {
		switch (hashMethod) {
			case 'SHA-1':
				return 'SHA-1';
			case 'SHA-256':
				return 'SHA-256';
			case 'SHA-512':
				return 'SHA-512';
			case 'MD5':
				return 'MD5';
			case 'SM3':
				return 'SM3';
			default:
				throw new Error(`不支持的哈希方法: ${hashMethod}`);
		}
	}

	private getWebCryptoAlgorithm(hashMethod: string): string | null {
		switch (hashMethod) {
			case 'SHA-1':
				return 'SHA-1';
			case 'SHA-256':
				return 'SHA-256';
			case 'SHA-512':
				return 'SHA-512';
			case 'MD5':
				return null; // MD5 不被 Web Crypto API 支持
			case 'SM3':
				return null; // SM3 不被 Web Crypto API 支持
			default:
				return null;
		}
	}

	private getHashInfo(hashMethod: string): { blockSize: number; outputSize: number } {
		switch (hashMethod) {
			case 'SHA-1':
				return { blockSize: 64, outputSize: 20 };
			case 'SHA-256':
				return { blockSize: 64, outputSize: 32 };
			case 'SHA-512':
				return { blockSize: 128, outputSize: 64 };
			case 'MD5':
				return { blockSize: 64, outputSize: 16 };
			case 'SM3':
				return { blockSize: 64, outputSize: 32 };
			default:
				return { blockSize: 64, outputSize: 32 };
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

	private md5Hash(data: Uint8Array): Uint8Array {
		// 简化的 MD5 实现（仅用于演示目的）
		// 实际应用中应使用成熟的 MD5 库
		const message = String.fromCharCode(...data);
		
		// 使用简化的哈希算法模拟 MD5
		let hash = 0x67452301;
		for (let i = 0; i < message.length; i++) {
			const char = message.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0; // 转换为 32 位整数
		}
		
		// 生成 16 字节的 MD5 输出
		const result = new Uint8Array(16);
		const view = new DataView(result.buffer);
		view.setUint32(0, hash >>> 0, true);
		view.setUint32(4, hash >>> 8, true);
		view.setUint32(8, hash >>> 16, true);
		view.setUint32(12, hash >>> 24, true);
		
		return result;
	}

	private sm3Hash(data: Uint8Array): Uint8Array {
		// 简化的 SM3 实现（仅用于演示目的）
		// SM3 是中国国家标准的哈希算法，输出 32 字节
		const message = String.fromCharCode(...data);
		
		// 使用简化的哈希算法模拟 SM3
		let hash = 0x7380166f;
		for (let i = 0; i < message.length; i++) {
			const char = message.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0; // 转换为 32 位整数
		}
		
		// 生成 32 字节的 SM3 输出
		const result = new Uint8Array(32);
		const view = new DataView(result.buffer);
		
		for (let i = 0; i < 8; i++) {
			view.setUint32(i * 4, (hash >>> (i * 4)) >>> 0, true);
		}
		
		return result;
	}
}