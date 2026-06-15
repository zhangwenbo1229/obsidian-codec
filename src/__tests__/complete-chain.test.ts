import { describe, it, expect, beforeEach } from 'vitest';
import { ChainProcessor } from '../chain-processor';
import { globalRegistry } from '../operation-registry';
import { registerAllOperations } from '../operations/registry';
import { OperationConfig } from '../types';

describe('完整操作链功能测试', () => {
	let processor: ChainProcessor;

	beforeEach(() => {
		globalRegistry.clear();
		registerAllOperations();
		processor = new ChainProcessor(globalRegistry);
	});

	it('应该执行完整的编码解码链', async () => {
		const chain: OperationConfig[] = [
			{ operationId: 'base64-encode', config: {} },
			{ operationId: 'url-encode', config: {} }
		];
		
		const result = await processor.executeChain('Hello World', chain);
		
		expect(result.success).toBe(true);
		expect(result.data).toBe('SGVsbG8gV29ybGQ%3D');
	});

	it('应该执行双重 Base64 解码', async () => {
		const chain: OperationConfig[] = [
			{ operationId: 'base64-decode', config: {} },
			{ operationId: 'base64-decode', config: {} }
		];
		
		// 双重 Base64 编码的 "Hello"
		const input = 'U0dWc2JHOD0='; // 正确的双重 Base64 编码
		const result = await processor.executeChain(input, chain);
		
		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello');
	});

	it('应该执行复杂的 Unicode 编码链', async () => {
		const chain: OperationConfig[] = [
			{ operationId: 'unicode-encode', config: {} },
			{ operationId: 'base64-encode', config: {} }
		];
		
		const result = await processor.executeChain('你好', chain);
		
		expect(result.success).toBe(true);
	});

	it('应该执行哈希操作链', async () => {
		const chain: OperationConfig[] = [
			{ operationId: 'md5', config: {} },
			{ operationId: 'sha256', config: {} }
		];
		
		const result = await processor.executeChain('Hello', chain);
		
		expect(result.success).toBe(true);
		// MD5 哈希值的 SHA256 哈希
		expect(result.data).toBeTruthy();
		expect(result.data.length).toBe(64);
	});

	it('应该处理包含错误输入的操作链', async () => {
		const chain: OperationConfig[] = [
			{ operationId: 'base64-decode', config: {} },
			{ operationId: 'url-encode', config: {} }
		];
		
		const result = await processor.executeChain('Invalid!@#', chain);
		
		expect(result.success).toBe(false);
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].success).toBe(false);
	});

	it('应该列出所有注册的操作', () => {
		const operations = globalRegistry.listAll();
		
		expect(operations.length).toBe(15); // 6编码对 + JWT + 4哈希
	});

	it('应该能按分类查找操作', () => {
		const encodingOps = globalRegistry.getByCategory('encoding');
		const decodingOps = globalRegistry.getByCategory('decoding');
		const hashOps = globalRegistry.getByCategory('hash');
		
		expect(encodingOps.length).toBeGreaterThan(0);
		expect(decodingOps.length).toBeGreaterThan(0);
		expect(hashOps.length).toBe(4);
	});

	it('应该能搜索操作', () => {
		const results = globalRegistry.search('base64');
		
		expect(results.length).toBe(2);
		expect(results[0].id).toContain('base64');
		expect(results[1].id).toContain('base64');
	});
});