import { describe, it, expect } from 'vitest';
import { UnicodeEncodeOperation } from '../unicode';
import { UnicodeDecodeOperation } from '../unicode';

describe('UnicodeEncodeOperation', () => {
	it('should encode text to unicode escape sequences', async () => {
		const operation = new UnicodeEncodeOperation();
		const result = await operation.execute('Hello', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('\\u0048\\u0065\\u006c\\u006c\\u006f');
	});

	it('should encode unicode characters', async () => {
		const operation = new UnicodeEncodeOperation();
		const result = await operation.execute('你好', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('\\u4f60\\u597d');
	});

	it('should encode mixed content', async () => {
		const operation = new UnicodeEncodeOperation();
		const result = await operation.execute('Hi你好', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('\\u0048\\u0069\\u4f60\\u597d');
	});

	it('should handle empty string', async () => {
		const operation = new UnicodeEncodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should have correct metadata', () => {
		const operation = new UnicodeEncodeOperation();
		expect(operation.id).toBe('unicode-encode');
		expect(operation.name).toBe('Unicode 转义编码');
		expect(operation.category).toBe('encoding');
		expect(operation.description).toBeDefined();
	});
});

describe('UnicodeDecodeOperation', () => {
	it('should decode unicode escape sequences to text', async () => {
		const operation = new UnicodeDecodeOperation();
		const result = await operation.execute('\\u0048\\u0065\\u006c\\u006c\\u006f', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello');
	});

	it('should decode unicode characters', async () => {
		const operation = new UnicodeDecodeOperation();
		const result = await operation.execute('\\u4f60\\u597d', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('你好');
	});

	it('should decode mixed content', async () => {
		const operation = new UnicodeDecodeOperation();
		const result = await operation.execute('\\u0048\\u0069\\u4f60\\u597d', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hi你好');
	});

	it('should handle empty string', async () => {
		const operation = new UnicodeDecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should handle malformed unicode sequences', async () => {
		const operation = new UnicodeDecodeOperation();
		const result = await operation.execute('\\u0048\\u0065\\u006', {}); // 最后一个不完整
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should have correct metadata', () => {
		const operation = new UnicodeDecodeOperation();
		expect(operation.id).toBe('unicode-decode');
		expect(operation.name).toBe('Unicode 转义解码');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});