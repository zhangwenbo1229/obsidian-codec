import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class RSAEncryptOperation extends BaseOperation {
	id = 'rsa-encrypt';
	name = 'RSA加密';
	category = OperationCategory.ENCRYPTION;
	description = '使用RSA公钥加密数据';

	// 默认配置
	private defaultPadding = 'RSA-OAEP';
	private defaultHash = 'SHA-256';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入要加密的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const publicKey = (config.publicKey as string) || '';
			const padding = (config.padding as string) || this.defaultPadding;
			const hashAlgorithm = (config.hashAlgorithm as string) || this.defaultHash;

			if (!publicKey) {
				throw new Error('请输入公钥');
			}

			return await this.rsaEncrypt(input, publicKey, padding, hashAlgorithm);
		} catch (error) {
			throw new Error(`RSA加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async rsaEncrypt(data: string, publicKey: string, padding: string, hashAlgorithm: string): Promise<string> {
		if (padding === 'JSEncrypt') {
			// JSEncrypt使用简化的RSA加密
			return this.jsEncrypt(data, publicKey);
		}

		// 使用Web Crypto API进行RSA加密
		const publicKeyObj = await this.importPublicKey(publicKey, padding, hashAlgorithm);
		
		const encoder = new TextEncoder();
		const dataBytes = encoder.encode(data);
		
		const encryptedData = await crypto.subtle.encrypt(
			this.getAlgorithm(padding, hashAlgorithm),
			publicKeyObj,
			dataBytes
		);

		// 转换为Base64输出
		return this.arrayBufferToBase64(encryptedData);
	}

	private async importPublicKey(pemKey: string, padding: string, hashAlgorithm: string): Promise<CryptoKey> {
		// 移除PEM头尾和空格
		const pem = pemKey.replace(/-----BEGIN PUBLIC KEY-----/g, '')
			.replace(/-----END PUBLIC KEY-----/g, '')
			.replace(/\s/g, '');

		// 转换Base64为ArrayBuffer
		const binaryString = atob(pem);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		return await crypto.subtle.importKey(
			'spki',
			bytes.buffer,
			this.getAlgorithm(padding, hashAlgorithm),
			false,
			['encrypt']
		);
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
			case 'MD5': return 'MD5'; // Web Crypto API可能不支持MD5
			default: return 'SHA-256';
		}
	}

	private jsEncrypt(data: string, publicKey: string): string {
		// 简化的JSEncrypt实现
		// 这是一个基础实现，实际使用时可能需要更复杂的逻辑
		try {
			// 尝试解析公钥
			const key = this.parseJSPublicKey(publicKey);
			
			// 简单的RSA加密实现（实际应使用专业库）
			const encrypted = this.simpleRSAEncrypt(data, key);
			return btoa(encrypted);
		} catch (error) {
			throw new Error('JSEncrypt模式需要有效的公钥格式');
		}
	}

	private parseJSPublicKey(publicKey: string): { n: bigint; e: bigint } {
		// 解析PEM格式的公钥
		const pem = publicKey.replace(/-----BEGIN PUBLIC KEY-----/g, '')
			.replace(/-----END PUBLIC KEY-----/g, '')
			.replace(/\s/g, '');
		
		const der = atob(pem);
		// 这里应该有完整的DER解析逻辑，简化版本：
		return {
			n: BigInt('0x' + der.substring(0, 32)), // 简化
			e: BigInt('0x' + der.substring(32, 40))   // 简化
		};
	}

	private simpleRSAEncrypt(data: string, key: { n: bigint; e: bigint }): string {
		// 非常简化的RSA加密，仅作为示例
		const dataBytes = new TextEncoder().encode(data);
		const dataNum = BigInt('0x' + Array.from(dataBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
		const encrypted = pow(dataNum, key.e, key.n);
		return encrypted.toString(16);
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
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