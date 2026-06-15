import { describe, it, expect } from 'vitest';
import { URLEncodeOperation } from '../url';
import { URLDecodeOperation } from '../url';

describe('URLEncodeOperation', () => {
	it('should encode text to URL format', async () => {
		const operation = new URLEncodeOperation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello%20World');
	});

	it('should encode special characters', async () => {
		const operation = new URLEncodeOperation();
		const result = await operation.execute('hello@world#test', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('hello%40world%23test');
	});

	it('should encode unicode characters', async () => {
		const operation = new URLEncodeOperation();
		const result = await operation.execute('你好世界', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C');
	});

	it('should encode empty string', async () => {
		const operation = new URLEncodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should have correct metadata', () => {
		const operation = new URLEncodeOperation();
		expect(operation.id).toBe('url-encode');
		expect(operation.name).toBe('URL 编码');
		expect(operation.category).toBe('encoding');
		expect(operation.description).toBeDefined();
	});
});

describe('URLDecodeOperation', () => {
	it('should decode URL format to text', async () => {
		const operation = new URLDecodeOperation();
		const result = await operation.execute('Hello%20World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello World');
	});

	it('should decode special characters', async () => {
		const operation = new URLDecodeOperation();
		const result = await operation.execute('hello%40world%23test', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('hello@world#test');
	});

	it('should decode unicode characters', async () => {
		const operation = new URLDecodeOperation();
		const result = await operation.execute('%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('你好世界');
	});

	it('should decode empty string', async () => {
		const operation = new URLDecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should handle malformed URL encoding', async () => {
		const operation = new URLDecodeOperation();
		const result = await operation.execute('Hello%World', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should have correct metadata', () => {
		const operation = new URLDecodeOperation();
		expect(operation.id).toBe('url-decode');
		expect(operation.name).toBe('URL 解码');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});