import { describe, it, expect } from 'vitest';
import { Base64EncodeOperation } from '../base64';
import { Base64DecodeOperation } from '../base64';

describe('Base64EncodeOperation', () => {
	it('should encode text to base64', async () => {
		const operation = new Base64EncodeOperation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('SGVsbG8gV29ybGQ=');
	});

	it('should encode empty string', async () => {
		const operation = new Base64EncodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should encode special characters', async () => {
		const operation = new Base64EncodeOperation();
		const result = await operation.execute('Hello@World#123', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('SGVsbG9AV29ybGQjMTIz');
	});

	it('should encode unicode characters', async () => {
		const operation = new Base64EncodeOperation();
		const result = await operation.execute('你好世界', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('5L2g5aW95LiW55WM');
	});

	it('should have correct metadata', () => {
		const operation = new Base64EncodeOperation();
		expect(operation.id).toBe('base64-encode');
		expect(operation.name).toBe('Base64 编码');
		expect(operation.category).toBe('encoding');
		expect(operation.description).toBeDefined();
	});
});

describe('Base64DecodeOperation', () => {
	it('should decode base64 to text', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('SGVsbG8gV29ybGQ=', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello World');
	});

	it('should decode empty string', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should decode special characters', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('SGVsbG9AV29ybGQjMTIz', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello@World#123');
	});

	it('should decode unicode characters', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('5L2g5aW95LiW55WM', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('你好世界');
	});

	it('should handle invalid base64', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('Invalid@#Base64!', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should handle malformed base64', async () => {
		const operation = new Base64DecodeOperation();
		const result = await operation.execute('SGVsbG8=', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello');
	});

	it('should have correct metadata', () => {
		const operation = new Base64DecodeOperation();
		expect(operation.id).toBe('base64-decode');
		expect(operation.name).toBe('Base64 解码');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});