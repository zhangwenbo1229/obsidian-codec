import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class JWTDecodeOperation extends BaseOperation {
	id = 'jwt-decode';
	name = 'JWT 解析';
	category = OperationCategory.DECODING;
	description = '解析 JWT Token，显示头部和载荷（简化版，不验证签名）';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input) {
			return { valid: true }; // 允许空字符串
		}
		
		const parts = input.split('.');
		if (parts.length !== 3) {
			return { valid: false, error: 'JWT 必须包含 3 个部分（头部.载荷.签名）' };
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			if (input === '') {
				return '';
			}
			
			const parts = input.split('.');
			const [headerB64, payloadB64] = parts;
			
			let header: Record<string, unknown>;
			let payload: Record<string, unknown>;
			
			try {
				const headerStr = atob(this.base64UrlDecode(headerB64 || ''));
				header = JSON.parse(headerStr);
			} catch (error) {
				throw new Error('JWT 头部解析失败：无效的 Base64URL 格式');
			}
			
			try {
				const payloadStr = atob(this.base64UrlDecode(payloadB64 || ''));
				payload = JSON.parse(payloadStr);
			} catch (error) {
				throw new Error('JWT 载荷解析失败：无效的 Base64URL 格式');
			}
			
			const result = {
				header,
				payload,
				signature: parts[2]
			};
			
			return JSON.stringify(result, null, 2);
		} catch (error) {
			throw new Error(`JWT 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
	
	private base64UrlDecode(base64Url: string): string {
		base64Url = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		
		while (base64Url.length % 4) {
			base64Url += '=';
		}
		
		return base64Url;
	}
}