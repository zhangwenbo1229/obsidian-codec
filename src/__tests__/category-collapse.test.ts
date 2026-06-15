import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOperationRegistry } from '../operation-registry';
import { Base64EncodeOperation, Base64DecodeOperation } from '../operations/implementations/encodings/base64';

describe('分类折叠功能测试', () => {
	let registry: InMemoryOperationRegistry;

	beforeEach(() => {
		registry = new InMemoryOperationRegistry();
		registry.register(new Base64EncodeOperation());
		registry.register(new Base64DecodeOperation());
	});

	it('应该能够按分类获取操作', () => {
		const encodingOps = registry.getByCategory('encoding');
		const decodingOps = registry.getByCategory('decoding');
		
		expect(encodingOps.length).toBeGreaterThan(0);
		expect(decodingOps.length).toBeGreaterThan(0);
	});

	it('编码分类应该包含编码操作', () => {
		const encodingOps = registry.getByCategory('encoding');
		const hasBase64Encode = encodingOps.some(op => op.id === 'base64-encode');
		
		expect(hasBase64Encode).toBe(true);
	});

	it('解码分类应该包含解码操作', () => {
		const decodingOps = registry.getByCategory('decoding');
		const hasBase64Decode = decodingOps.some(op => op.id === 'base64-decode');
		
		expect(hasBase64Decode).toBe(true);
	});
});