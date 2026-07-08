import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class RSADecryptOperation extends BaseOperation {
	id = 'rsa-decrypt';
	name = 'RSA解密';
	category = OperationCategory.DECRYPTION;
	description = '使用RSA私钥解密数据';

	// 默认配置
	private defaultPadding = 'RSA-OAEP';
	private defaultHash = 'SHA-256';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入要解密的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const privateKey = (config.privateKey as string) || '';
			const padding = (config.padding as string) || this.defaultPadding;
			const hashAlgorithm = (config.hashAlgorithm as string) || this.defaultHash;

			if (!privateKey) {
				throw new Error('请输入私钥');
			}

			return await this.rsaDecrypt(input, privateKey, padding, hashAlgorithm);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : '未知错误';
			throw new Error(errorMessage);
		}
	}

	private async rsaDecrypt(encryptedData: string, privateKey: string, padding: string, hashAlgorithm: string): Promise<string> {
		try {
			// 首先尝试使用Web Crypto API
			return await this.webCryptoDecrypt(encryptedData, privateKey, padding, hashAlgorithm);
		} catch (webCryptoError) {
			// 如果Web Crypto API失败，使用手动解密
			return await this.manualRSADecrypt(encryptedData, privateKey, padding);
		}
	}

	private async webCryptoDecrypt(encryptedData: string, privateKey: string, padding: string, hashAlgorithm: string): Promise<string> {
		const privateKeyObj = await this.importPrivateKey(privateKey, padding, hashAlgorithm);
		const encryptedBytes = this.base64ToArrayBuffer(encryptedData);
		
		const decryptedData = await crypto.subtle.decrypt(
			this.getAlgorithm(padding, hashAlgorithm),
			privateKeyObj,
			encryptedBytes
		);

		const decoder = new TextDecoder();
		return decoder.decode(decryptedData);
	}

	private async manualRSADecrypt(encryptedData: string, privateKeyPem: string, padding: string): Promise<string> {
		// 解析PKCS#1私钥
		const privateKey = this.parsePKCS1PrivateKey(privateKeyPem);
		
		// 解码Base64加密数据
		const encryptedBytes = this.manualBase64ToArrayBuffer(encryptedData.replace(/\s/g, ''));
		const encryptedArray = new Uint8Array(encryptedBytes);
		
		// 将加密数据转换为大整数（使用适当的填充）
		const encryptedInt = this.bytesToBigInteger(encryptedArray);
		
		// 执行RSA解密: m = c^d mod n
		const decryptedInt = this.modPow(encryptedInt, privateKey.d, privateKey.n);
		
		// 将解密结果转换为字节数组
		const decryptedBytes = this.bigIntegerToBytes(decryptedInt);
		
		// 移除PKCS#1 v1.5填充（如果使用）
		const unpaddedBytes = this.removePKCS1Padding(decryptedBytes, encryptedArray.length);
		
		// 转换为字符串
		const decoder = new TextDecoder();
		return decoder.decode(unpaddedBytes);
	}

	private parsePKCS1PrivateKey(pemKey: string): { n: bigint; d: bigint; e: bigint } {
		// 移除PEM头尾
		const pem = pemKey.replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
			.replace(/-----END RSA PRIVATE KEY-----/g, '')
			.replace(/\s/g, '');
		
		// 解码Base64
		const keyBytes = this.manualBase64ToArrayBuffer(pem);
		const keyArray = new Uint8Array(keyBytes);
		
		// 简化的PKCS#1 RSAPrivateKey解析
		// 实际实现需要完整的ASN.1解析，这里使用简化版本
		
		// 在实际应用中，您需要使用完整的ASN.1解析库
		// 这里返回模拟数据用于演示
		throw new Error(`完整的PKCS#1私钥解析需要ASN.1库。

由于Web Crypto API的限制，当前版本仅支持PKCS#8格式的私钥。

请使用以下OpenSSL命令将您的私钥转换为PKCS#8格式：

# 转换命令
openssl pkcs8 -topk8 -in your_private_key.pem -out pkcs8_private_key.pem

转换后的私钥将以 -----BEGIN PRIVATE KEY----- 开头，可以正常使用。

或者，您可以使用支持PKCS#1格式的专业密码学库来处理您的数据。`);
	}

	private bytesToBigInteger(bytes: Uint8Array): bigint {
		let result = BigInt(0);
		for (let i = 0; i < bytes.length; i++) {
			result = (result << BigInt(8)) | BigInt(bytes[i]);
		}
		return result;
	}

	private bigIntegerToBytes(bigint: bigint): Uint8Array {
		const hex = bigint.toString(16).padStart(2, '0');
		const bytes = new Uint8Array(Math.ceil(hex.length / 2));
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}

	private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
		let result = BigInt(1);
		base = base % modulus;
		while (exponent > BigInt(0)) {
			if (exponent % BigInt(2) === BigInt(1)) {
				result = (result * base) % modulus;
			}
			exponent = exponent / BigInt(2);
			base = (base * base) % modulus;
		}
		return result;
	}

	private removePKCS1Padding(data: Uint8Array, encryptedLength: number): Uint8Array {
		// 简化的PKCS#1 v1.5填充移除
		// 实际实现需要更复杂的逻辑
		
		// 查找填充结束标记（假设是标准格式）
		let startIndex = 0;
		for (let i = 0; i < data.length - 1; i++) {
			if (data[i] === 0x00) {
				startIndex = i + 1;
				break;
			}
		}
		
		return data.slice(startIndex);
	}

	private async importPrivateKey(pemKey: string, padding: string, hashAlgorithm: string): Promise<CryptoKey> {
		// 检测私钥类型
		const isRsaPrivateKey = pemKey.includes('-----BEGIN RSA PRIVATE KEY-----');
		const isPrivateKey = pemKey.includes('-----BEGIN PRIVATE KEY-----');
		
		if (!isRsaPrivateKey && !isPrivateKey) {
			throw new Error('私钥格式不正确，必须以 -----BEGIN RSA PRIVATE KEY----- 或 -----BEGIN PRIVATE KEY----- 开头');
		}
		
		// 移除PEM头尾和空格
		let pem = pemKey.replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
			.replace(/-----END RSA PRIVATE KEY-----/g, '')
			.replace(/-----BEGIN PRIVATE KEY-----/g, '')
			.replace(/-----END PRIVATE KEY-----/g, '')
			.replace(/\s/g, '');

		// 使用手动Base64解码私钥
		try {
			let keyBytes = this.manualBase64ToArrayBuffer(pem);
			
			// 对于传统的RSA PRIVATE KEY，转换为PKCS#8格式
			let finalKeyBytes: ArrayBuffer;
			
			if (isRsaPrivateKey) {
				try {
					finalKeyBytes = this.convertPKCS1ToPKCS8(keyBytes);
				} catch (convertError) {
					throw new Error(`PKCS#1私钥格式转换失败: ${convertError instanceof Error ? convertError.message : '未知错误'}`);
				}
			} else {
				// PKCS#8格式，直接使用
				finalKeyBytes = keyBytes;
			}
			
			return await crypto.subtle.importKey(
				'pkcs8',
				finalKeyBytes,
				this.getAlgorithm(padding, hashAlgorithm),
				false,
				['decrypt']
			);
		} catch (error) {
			throw new Error(`私钥导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private convertPKCS1ToPKCS8(pkcs1Bytes: ArrayBuffer): ArrayBuffer {
		// 简化的PKCS#1到PKCS#8转换
		// 实际实现需要完整的ASN.1解析和重建
		
		const privateKeyData = new Uint8Array(pkcs1Bytes);
		
		// PKCS#8 PrivateKey结构:
		// PrivateKeyInfo ::= SEQUENCE {
		//   version Version,
		//   privateKeyAlgorithm AlgorithmIdentifier,
		//   privateKey OCTET STRING
		// }
		
		// 构建RSA算法标识符
		const rsaAlgorithm = [
			0x30, 0x0D, // SEQUENCE, length 13
			0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, // RSA OID
			0x05, 0x00  // NULL
		];
		
		// 构建完整的PKCS#8结构
		const pkcs8 = [
			0x30, 0x82, 0x00, 0x00, // SEQUENCE, length (placeholder)
			0x02, 0x01, 0x00, // INTEGER version 0
			...rsaAlgorithm,     // AlgorithmIdentifier
			0x04, 0x82, 0x00, 0x00  // OCTET STRING, length (placeholder)
		];
		
		// 计算总长度
		const totalLength = 4 + rsaAlgorithm.length + 4 + privateKeyData.length;
		const privateKeyOctetString = 4 + privateKeyData.length;
		
		// 更新长度字段
		pkcs8[2] = (totalLength >> 8) & 0xFF;
		pkcs8[3] = totalLength & 0xFF;
		pkcs8[pkcs8.length - 2] = (privateKeyOctetString >> 8) & 0xFF;
		pkcs8[pkcs8.length - 1] = privateKeyOctetString & 0xFF;
		
		// 组合所有部分
		const result = new Uint8Array(pkcs8.length + privateKeyData.length);
		result.set(pkcs8, 0);
		result.set(privateKeyData, pkcs8.length);
		
		return result.buffer;
	}

	private getAlgorithm(padding: string, hashAlgorithm: string): RsaHashedImportParams | RsaOaepParams {
		const hash = this.getHashAlgorithm(hashAlgorithm);
		
		switch (padding) {
			case 'RSA-OAEP':
				return { name: 'RSA-OAEP', hash };
			case 'PKCS1v15':
				// PKCS1v15 不支持加密，使用RSA-OAEP代替
				return { name: 'RSA-OAEP', hash };
			default:
				return { name: 'RSA-OAEP', hash };
		}
	}

	private getHashAlgorithm(hashAlgorithm: string): AlgorithmIdentifier {
		switch (hashAlgorithm) {
			case 'SHA-1': return 'SHA-1';
			case 'SHA-256': return 'SHA-256';
			case 'SHA-384': return 'SHA-384';
			case 'SHA-512': return 'SHA-512';
			case 'MD5': return 'MD5';
			default: return 'SHA-256';
		}
	}

	private jsDecrypt(encryptedData: string, privateKey: string): string {
		// 简化的JSEncrypt解密实现
		try {
			const key = this.parseJSPrivateKey(privateKey);
			const encrypted = atob(encryptedData);
			const decrypted = this.simpleRSADecrypt(encrypted, key);
			return new TextDecoder().decode(this.hexToBytes(decrypted));
		} catch (error) {
			throw new Error('JSEncrypt模式需要有效的私钥格式');
		}
	}

	private parseJSPrivateKey(privateKey: string): { n: bigint; d: bigint } {
		// 解析PEM格式的私钥
		const pem = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
			.replace(/-----END PRIVATE KEY-----/g, '')
			.replace(/\s/g, '');
		
		const der = atob(pem);
		// 这里应该有完整的DER解析逻辑，简化版本：
		return {
			n: BigInt('0x' + der.substring(0, 32)), // 简化
			d: BigInt('0x' + der.substring(32, 64))  // 简化
		};
	}

	private simpleRSADecrypt(encryptedData: string, key: { n: bigint; d: bigint }): string {
		// 非常简化的RSA解密，仅作为示例
		const encryptedNum = BigInt('0x' + encryptedData);
		const decrypted = pow(encryptedNum, key.d, key.n);
		return decrypted.toString(16);
	}

	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		// 首先进行简单的Base64验证
		if (!base64 || base64.length === 0) {
			throw new Error('[调试-1] Base64输入为空');
		}
		
		// 清理Base64字符串：移除所有空白字符
		let cleanedBase64 = base64.replace(/\s/g, '');
		
		if (cleanedBase64.length === 0) {
			throw new Error('[调试-2] 清理后Base64为空');
		}
		
		// 快速长度检查
		if (cleanedBase64.length % 4 !== 0) {
			throw new Error(`[调试-3] Base64长度 ${cleanedBase64.length} 不能被4整除`);
		}
		
		// 验证Base64字符集
		const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
		if (!base64Regex.test(cleanedBase64)) {
			throw new Error(`[调试-4] Base64包含无效字符`);
		}
		
		// 补全必要��padding
		while (cleanedBase64.length % 4 !== 0) {
			cleanedBase64 += '=';
		}
		
		// 直接使用手动Base64解码，完全绕过atob()
		try {
			return this.manualBase64ToArrayBuffer(cleanedBase64);
		} catch (manualError) {
			throw new Error(`[调试-5] 手动Base64解码失败: ${manualError instanceof Error ? manualError.message : '未知错误'}`);
		}
	}

	private nativeBase64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	}

	private manualBase64ToArrayBuffer(base64: string): ArrayBuffer {
		// Base64字符映射表
		const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		const reverseLookup = new Map<number, number>();
		
		for (let i = 0; i < base64Chars.length; i++) {
			reverseLookup.set(base64Chars.charCodeAt(i), i);
		}
		
		// 移除padding字符
		const base64String = base64.replace(/=/g, '');
		const length = base64String.length;
		
		// 计算输出长度
		const outputLength = (length * 3) / 4;
		const bytes = new Uint8Array(outputLength);
		
		let buffer = 0;
		let bufferBits = 0;
		let byteIndex = 0;
		
		for (let i = 0; i < length; i++) {
			const char = base64String.charCodeAt(i);
			const value = reverseLookup.get(char);
			
			if (value === undefined) {
				throw new Error(`无效Base64字符: ${String.fromCharCode(char)} (位置: ${i})`);
			}
			
			buffer = (buffer << 6) | value;
			bufferBits += 6;
			
			if (bufferBits >= 8) {
				bufferBits -= 8;
				bytes[byteIndex++] = (buffer >> bufferBits) & 0xFF;
			}
		}
		
		return bytes.buffer;
	}

	private hexToBytes(hex: string): Uint8Array {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}
}

// 辅助函数：模幂运算
function pow(base: bigint, exponent: bigint, modulus: bigint): bigint {
	let result = BigInt(1);
	base = base % modulus;
	while (exponent > 0) {
		if (exponent % BigInt(2) === BigInt(1)) {
			result = (result * base) % modulus;
		}
		exponent = exponent / BigInt(2);
		base = (base * base) % modulus;
	}
	return result;
}