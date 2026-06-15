import { describe, it, expect } from 'vitest';
import { HexEncodeOperation } from '../hex';
import { HexDecodeOperation } from '../hex';

describe('HexEncodeOperation', () => {
	it('should encode text to hex format', async () => {
		const operation = new HexEncodeOperation();
		const result = await operation.execute('Hello', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('48656c6c6f');
	});

	it('should encode special characters', async () => {
		const operation = new HexEncodeOperation();
		const result = await operation.execute('hello@world', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('68656c6c6f40776f726c64');
	});

	it('should encode unicode characters', async () => {
		const operation = new HexEncodeOperation();
		const result = await operation.execute('你好', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('e4bda0e5a5bd');
	});

	it('should encode empty string', async () => {
		const operation = new HexEncodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should have correct metadata', () => {
		const operation = new HexEncodeOperation();
		expect(operation.id).toBe('hex-encode');
		expect(operation.name).toBe('Hex 编码');
		expect(operation.category).toBe('encoding');
		expect(operation.description).toBeDefined();
	});
});

describe('HexDecodeOperation', () => {
	it('should decode hex format to text', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('48656c6c6f', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello');
	});

	it('should decode special characters', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('68656c6c6f40776f726c64', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('hello@world');
	});

	it('should decode unicode characters', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('e4bda0e5a5bd', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('你好');
	});

	it('should decode empty string', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should handle malformed hex format', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('GGGG', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should handle odd length hex', async () => {
		const operation = new HexDecodeOperation();
		const result = await operation.execute('48656c6c6', {}); // 'Hell' 加上额外的 '6' 变成奇数长度
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should have correct metadata', () => {
		const operation = new HexDecodeOperation();
		expect(operation.id).toBe('hex-decode');
		expect(operation.name).toBe('Hex 解码');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});