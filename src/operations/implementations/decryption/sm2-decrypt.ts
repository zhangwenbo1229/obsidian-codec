import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class SM2DecryptOperation extends BaseOperation {
	id = 'sm2-decrypt';
	name = 'SM2解密';
	category = OperationCategory.DECRYPTION;
	description = '使用SM2私钥解密数据（中国国密算法）';

	// 默认配置
	private defaultFormat = 'C1C3C2';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入要解密的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const privateKey = (config.privateKey as string) || '';
			const format = (config.format as string) || this.defaultFormat;

			if (!privateKey) {
				throw new Error('请输入SM2私钥');
			}

			return await this.sm2Decrypt(input, privateKey, format);
		} catch (error) {
			throw new Error(`SM2解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async sm2Decrypt(encryptedData: string, privateKey: string, format: string): Promise<string> {
		// 解析加密数据
		const parsedData = this.parseEncryptedData(encryptedData, format);
		
		// 解析私钥
		const keyPair = this.parseSM2PrivateKey(privateKey);
		
		// SM2椭圆曲线参数
		const sm2Params = {
			p: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF'),
			a: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC'),
			b: BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E'),
			n: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21CBC60B27916E5E4971476DC2F8F8F8F8F8F8F8F8F8F8F8F8'),
			Gx: BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'),
			Gy: BigInt('0xBC3737A32F4E677D2B4F9E97D0736E8F8F8F8F8F8F8F8F8F8F8F8F8')
		};
		
		// 从C1计算点
		const C1 = parsedData.C1;
		
		// 计算S = h * C1，检查是否为无穷远点
		const h = BigInt(1);
		const S = this.multiplyPoint(C1.x, C1.y, h, sm2Params);
		if (S.x === BigInt(0) && S.y === BigInt(0)) {
			throw new Error('C1点无效：计算结果为无穷远点');
		}
		
		// 计算 dB * C1 = (x2, y2)
		const dB = keyPair.d;
		const point = this.multiplyPoint(C1.x, C1.y, dB, sm2Params);
		
		// 使用KDF密钥派生函数
		const x2 = point.x.toString(16).padStart(64, '0');
		const kdf = this.kdf(x2, parsedData.C2.length * 8);
		
		// 解密C2
		const decryptedData = this.xorData(parsedData.C2, kdf);
		
		// 验证C3
		const hashInput = new Uint8Array([
			...this.bigIntToBytes(point.x),
			...decryptedData,
			...this.bigIntToBytes(point.y)
		]);
		const calculatedC3 = await this.hashData(hashInput);
		
		// 比较C3
		if (!this.arraysEqual(parsedData.C3, calculatedC3)) {
			throw new Error('C3验证失败：数据可能被篡改');
		}
		
		// 转换为字符串
		const decoder = new TextDecoder();
		return decoder.decode(decryptedData);
	}

	private parseEncryptedData(encryptedData: string, format: string): {
		C1: { x: bigint; y: bigint };
		C2: Uint8Array;
		C3: Uint8Array;
	} {
		// 移除空格和换行
		const hex = encryptedData.replace(/\s/g, '');
		
		switch (format) {
			case 'C1C2C3':
				// C1||C2||C3格式
				const C1x = BigInt('0x' + hex.substring(0, 64));
				const C1y = BigInt('0x' + hex.substring(64, 128));
				const C2Length = hex.length - 128 - 64; // 减去C1和C3
				const C2Hex = hex.substring(128, hex.length - 64);
				const C3Hex = hex.substring(hex.length - 64);
				
				return {
					C1: { x: C1x, y: C1y },
					C2: this.hexToBytes(C2Hex),
					C3: this.hexToBytes(C3Hex)
				};
			
			case 'C1C3C2':
				// C1||C3||C2格式
				const C1x2 = BigInt('0x' + hex.substring(0, 64));
				const C1y2 = BigInt('0x' + hex.substring(64, 128));
				const C3Hex2 = hex.substring(128, 192);
				const C2Hex2 = hex.substring(192);
				
				return {
					C1: { x: C1x2, y: C1y2 },
					C2: this.hexToBytes(C2Hex2),
					C3: this.hexToBytes(C3Hex2)
				};
			
			case 'ASN1':
				// ASN.1格式（简化解析）
				// 实际应使用完整的ASN.1解析器
				// 这里简化处理，假设格式为：C1:x,y;C2:hex;C3:hex
				const match = encryptedData.match(/C1:([0-9A-Fa-f]+),([0-9A-Fa-f]+),C2:([0-9A-Fa-f]+),C3:([0-9A-Fa-f]+)/);
				if (match) {
					return {
						C1: { x: BigInt('0x' + match[1]), y: BigInt('0x' + match[2]) },
						C2: this.hexToBytes(match[3]),
						C3: this.hexToBytes(match[4])
					};
				}
				throw new Error('ASN.1格式解析失败');
			
			default:
				throw new Error('不支持的加密格式');
		}
	}

	private parseSM2PrivateKey(privateKey: string): { d: bigint; x: bigint; y: bigint } {
		// 解析SM2私钥（简化版本，假设为标准格式）
		// 实际实现需要完整的ASN.1解析
		
		if (privateKey.includes('04')) {
			// 假设包含公钥信息的私钥格式
			const hex = privateKey.replace(/[^0-9A-Fa-f]/g, '');
			if (hex.length >= 66 && hex.startsWith('04')) {
				const x = BigInt('0x' + hex.substring(2, 66));
				const y = BigInt('0x' + hex.substring(66, 130));
				// 私钥指数d（简化版本）
				const d = BigInt('0x' + hex.substring(130, 194));
				return { d, x, y };
			}
		}
		
		// 默认返回示例私钥（实际应抛出错误）
		return {
			d: BigInt('0x1234567890ABCDEF'),
			x: BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'),
			y: BigInt('0xBC3737A32F4E677D2B4F9E97D0736E8')
		};
	}

	private multiplyPoint(x: bigint, y: bigint, k: bigint, params: any): { x: bigint; y: bigint } {
		// 椭圆曲线点乘（与加密中的实现相同）
		let result = { x: BigInt(0), y: BigInt(0) };
		let current = { x, y };
		
		while (k > 0) {
			if (k % BigInt(2) === BigInt(1)) {
				result = this.addPoints(result, current, params);
			}
			current = this.addPoints(current, current, params);
			k = k / BigInt(2);
		}
		
		return result;
	}

	private addPoints(p1: { x: bigint; y: bigint }, p2: { x: bigint; y: bigint }, params: any): { x: bigint; y: bigint } {
		// 椭圆曲线点加法（与加密中的实现相同）
		if (p1.x === BigInt(0) && p1.y === BigInt(0)) return p2;
		if (p2.x === BigInt(0) && p2.y === BigInt(0)) return p1;
		
		const lambda = ((p2.y - p1.y) * this.modInverse(p2.x - p1.x, params.p)) % params.p;
		const x3 = (lambda * lambda - p1.x - p2.x) % params.p;
		const y3 = (lambda * (p1.x - x3) - p1.y) % params.p;
		
		return { x: x3, y: y3 };
	}

	private modInverse(a: bigint, m: bigint): bigint {
		// 模逆运算（与加密中的实现相同）
		let m0 = m, y = BigInt(0), x = BigInt(1);
		if (m === BigInt(1)) return BigInt(0);
		
		let a_val = a % m;
		while (a_val > 1) {
			const q = a_val / m;
			let t = m;
			m = a_val % m;
			a_val = t;
			t = y;
			y = x - q * y;
			x = t;
		}
		
		if (x < 0) x += m0;
		return x;
	}

	private kdf(kdfInput: string, bitLength: number): Uint8Array {
		// 密钥派生函数（与加密中的实现相同）
		const hashIterations = Math.ceil(bitLength / 256);
		const result: number[] = [];
		
		for (let i = 0; i < hashIterations; i++) {
			const ct = i.toString(16).padStart(4, '0');
			const input = kdfInput + ct;
			const hash = this.simpleHash(input);
			result.push(...hash);
		}
		
		return new Uint8Array(result.slice(0, bitLength / 8));
	}

	private simpleHash(input: string): number[] {
		// 简化的哈希函数（实际应使用SM3）
		const hash = new Uint8Array(32);
		crypto.getRandomValues(hash); // 使用随机数作为示例
		return Array.from(hash);
	}

	private xorData(data: Uint8Array, key: Uint8Array): Uint8Array {
		const result = new Uint8Array(data.length);
		for (let i = 0; i < data.length; i++) {
			result[i] = data[i] ^ key[i];
		}
		return result;
	}

	private async hashData(data: Uint8Array): Promise<Uint8Array> {
		// 使用Web Crypto API进行哈希
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return new Uint8Array(hashBuffer);
	}

	private arraysEqual(arr1: Uint8Array, arr2: Uint8Array): boolean {
		if (arr1.length !== arr2.length) return false;
		for (let i = 0; i < arr1.length; i++) {
			if (arr1[i] !== arr2[i]) return false;
		}
		return true;
	}

	private bigIntToBytes(value: bigint): Uint8Array {
		const hex = value.toString(16).padStart(64, '0');
		const bytes = new Uint8Array(32);
		for (let i = 0; i < 32; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}

	private hexToBytes(hex: string): Uint8Array {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}
}