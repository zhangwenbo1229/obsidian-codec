import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class JWTSignOperation extends BaseOperation {
	id = 'jwt-sign';
	name = 'JWT 签名';
	category = OperationCategory.ENCODING;
	description = '生成 JWT Token，支持多种签名算法';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: false, error: '请输入 JWT Payload' };
		}
		
		try {
			// 验证 payload 是否为有效的 JSON
			JSON.parse(input);
			return { valid: true };
		} catch (error) {
			return { valid: false, error: 'Payload 必须是有效的 JSON 格式' };
		}
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const algorithm = (config.algorithm as string) || 'HS256';
			const secretKey = (config.secretKey as string) || '';
			const base64Encoded = (config.base64Encoded as boolean) || false;

			let processedKey = secretKey;
			if (base64Encoded && secretKey) {
				try {
					processedKey = atob(secretKey);
				} catch (error) {
					throw new Error('Base64 解码失败：无效的密钥格式');
				}
			}

			const payload = JSON.parse(input);
			
			const header = {
				alg: algorithm,
				typ: 'JWT'
			};

			const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
			const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
			
			const signature = await this.generateSignature(
				`${headerEncoded}.${payloadEncoded}`,
				processedKey,
				algorithm
			);

			return `${headerEncoded}.${payloadEncoded}.${signature}`;
		} catch (error) {
			throw new Error(`JWT 签名失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private base64UrlEncode(str: string): string {
		const base64 = btoa(str);
		return base64
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	private async generateSignature(data: string, key: string, algorithm: string): Promise<string> {
		// 处理 None 算法（大小写不敏感）
		if (algorithm.toLowerCase() === 'none') {
			return '';
		}

		const encoder = new TextEncoder();
		
		if (algorithm.startsWith('HS')) {
			// HMAC 算法
			const hashBits = parseInt(algorithm.substring(2)) || 256;
			const hashAlgorithm = `SHA-${hashBits}`;
			
			const keyData = encoder.encode(key);
			const dataBuffer = encoder.encode(data);
			
			const cryptoKey = await crypto.subtle.importKey(
				'raw',
				keyData,
				{ name: 'HMAC', hash: hashAlgorithm },
				false,
				['sign']
			);
			
			const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
			return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
		}
		
		if (algorithm.startsWith('RS') || algorithm.startsWith('PS')) {
			// RSA 算法需要更复杂的实现，这里提供简化版本
			throw new Error(`${algorithm} 算法需要密钥对，当前实现仅支持 HMAC 算法`);
		}
		
		if (algorithm.startsWith('ES')) {
			// ECDSA 算法也需要密钥对
			throw new Error(`${algorithm} 算法需要密钥对，当前实现仅支持 HMAC 算法`);
		}
		
		throw new Error(`不支持的算法: ${algorithm}`);
	}
}