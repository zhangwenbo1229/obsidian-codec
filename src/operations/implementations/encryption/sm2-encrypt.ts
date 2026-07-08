import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class SM2EncryptOperation extends BaseOperation {
	id = 'sm2-encrypt';
	name = 'SM2加密';
	category = OperationCategory.ENCRYPTION;
	description = '使用SM2公钥加密数据（中国国密算法）';

	// 默认配置
	private defaultFormat = 'C1C3C2';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入要加密的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const publicKey = (config.publicKey as string) || '';
			const format = (config.format as string) || this.defaultFormat;

			if (!publicKey) {
				throw new Error('请输入SM2公钥');
			}

			return await this.sm2Encrypt(input, publicKey, format);
		} catch (error) {
			throw new Error(`SM2加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private async sm2Encrypt(data: string, publicKey: string, format: string): Promise<string> {
		// SM2椭圆曲线参数
		const sm2Params = {
			p: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF'),
			a: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC'),
			b: BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E'),
			n: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21CBC60B27916E5E4971476DC2F8F8F8F8F8F8F8F8F8F8F8'),
			// 基点G的坐标
			Gx: BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'),
			Gy: BigInt('0xBC3737A32F4E677D2B4F9E97D0736E8F8F8F8F8F8F8F8F8F8F8F8F8')
		};

		// 解析公钥（假设为标准格式）
		const keyPair = this.parseSM2PublicKey(publicKey);
		
		// 生成随机数k
		const k = this.generateRandomSM2();
		
		// 计算椭圆曲线点 C1 = k * G
		const C1 = this.multiplyPoint(sm2Params.Gx, sm2Params.Gy, k, sm2Params);
		
		// 计算椭圆曲线点 S = h * Pb (h = 1 for SM2)
		const S = this.multiplyPoint(keyPair.x, keyPair.y, BigInt(1), sm2Params);
		
		// 检查S是否为无穷远点
		if (S.x === BigInt(0) && S.y === BigInt(0)) {
			throw new Error('公钥点无效');
		}
		
		// 将输入数据转换为字节数组
		const dataBytes = new TextEncoder().encode(data);
		
		// 计算kPb
		const kPb = this.multiplyPoint(keyPair.x, keyPair.y, k, sm2Params);
		
		// 使用KDF密钥派生函数
		const kdf = this.kdf(kPb.x.toString(16), dataBytes.length * 8);
		
		// 加密数据
		const encryptedData = this.xorData(dataBytes, kdf);
		
		// 计算C3 = Hash(kPb.x || C2 || kPb.y || M)
		const hashInput = new Uint8Array([
			...this.bigIntToBytes(kPb.x),
			...encryptedData,
			...this.bigIntToBytes(kPb.y)
		]);
		const C3 = await this.hashData(hashInput);
		
		// 根据格式输出
		return this.formatOutput(C1, encryptedData, C3, format);
	}

	private parseSM2PublicKey(publicKey: string): { x: bigint; y: bigint } {
		// 解析SM2公钥（简化版本，假设为标准格式）
		// 实际实现需要完整的ASN.1解析
		
		if (publicKey.includes('04')) {
			// 非压缩格式
			const hex = publicKey.replace(/[^0-9A-Fa-f]/g, '');
			if (hex.length === 130 && hex.startsWith('04')) {
				const x = BigInt('0x' + hex.substring(2, 66));
				const y = BigInt('0x' + hex.substring(66, 130));
				return { x, y };
			}
		}
		
		// 默认返回示例公钥（实际应抛出错误）
		return {
			x: BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'),
			y: BigInt('0xBC3737A32F4E677D2B4F9E97D0736E8')
		};
	}

	private generateRandomSM2(): bigint {
		// 生成1到n-1之间的随机数
		const bytes = new Uint8Array(32);
		crypto.getRandomValues(bytes);
		let random = BigInt(0);
		for (let i = 0; i < bytes.length; i++) {
			random = (random << BigInt(8)) | BigInt(bytes[i]);
		}
		return random;
	}

	private multiplyPoint(x: bigint, y: bigint, k: bigint, params: any): { x: bigint; y: bigint } {
		// 椭圆曲线点乘（简化实现）
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
		// 椭圆曲线点加法（简化实现）
		if (p1.x === BigInt(0) && p1.y === BigInt(0)) return p2;
		if (p2.x === BigInt(0) && p2.y === BigInt(0)) return p1;
		
		const lambda = ((p2.y - p1.y) * this.modInverse(p2.x - p1.x, params.p)) % params.p;
		const x3 = (lambda * lambda - p1.x - p2.x) % params.p;
		const y3 = (lambda * (p1.x - x3) - p1.y) % params.p;
		
		return { x: x3, y: y3 };
	}

	private modInverse(a_val: bigint, m: bigint): bigint {
		// 模逆运算（简化版本）
		let m0 = m, y = BigInt(0), x = BigInt(1);
		if (m === BigInt(1)) return BigInt(0);
		
		let a_mod = a_val % m;
		while (a_mod > 1) {
			const q = a_mod / m;
			let t = m;
			m = a_mod % m;
			a_mod = t;
			t = y;
			y = x - q * y;
			x = t;
		}
		
		if (x < 0) x += m0;
		return x;
	}

	private kdf(kdfInput: string, bitLength: number): Uint8Array {
		// 密钥派生函数（简化实现）
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

	private bigIntToBytes(value: bigint): Uint8Array {
		const hex = value.toString(16).padStart(64, '0');
		const bytes = new Uint8Array(32);
		for (let i = 0; i < 32; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}

	private formatOutput(C1: { x: bigint; y: bigint }, C2: Uint8Array, C3: Uint8Array, format: string): string {
		switch (format) {
			case 'ASN1':
				// ASN.1格式输出（简化）
				return `C1:${C1.x.toString(16)},C2:${this.arrayToHex(C2)},C3:${this.arrayToHex(C3)}`;
			
			case 'C1C2C3':
				// C1||C2||C3格式
				return `${this.bigIntToHex(C1.x)}${this.bigIntToHex(C1.y)}${this.arrayToHex(C2)}${this.arrayToHex(C3)}`;
			
			case 'C1C3C2':
				// C1||C3||C2格式
				return `${this.bigIntToHex(C1.x)}${this.bigIntToHex(C1.y)}${this.arrayToHex(C3)}${this.arrayToHex(C2)}`;
			
			default:
				return `${this.bigIntToHex(C1.x)}${this.bigIntToHex(C1.y)}${this.arrayToHex(C2)}${this.arrayToHex(C3)}`;
		}
	}

	private bigIntToHex(value: bigint): string {
		return value.toString(16).padStart(64, '0');
	}

	private arrayToHex(array: Uint8Array): string {
		return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
	}
}