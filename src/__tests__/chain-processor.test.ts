import { describe, it, expect, beforeEach } from 'vitest';
import { ChainProcessor } from '../chain-processor';
import { globalRegistry } from '../operation-registry';
import { Base64EncodeOperation } from '../operations/implementations/encodings/base64';
import { Base64DecodeOperation } from '../operations/implementations/encodings/base64';
import { URLEncodeOperation } from '../operations/implementations/encodings/url';
import { OperationConfig } from '../types';

describe('ChainProcessor', () => {
	let processor: ChainProcessor;

	beforeEach(() => {
		// 清理注册表
		globalRegistry.clear();
		
		processor = new ChainProcessor(globalRegistry);
		
		// 注册测试用操作
		globalRegistry.register(new Base64EncodeOperation());
		globalRegistry.register(new Base64DecodeOperation());
		globalRegistry.register(new URLEncodeOperation());
	});

	describe('基础功能', () => {
		it('应该执行单个操作', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-decode', config: {} }
			];
			
			const result = await processor.executeChain('SGVsbG8gV29ybGQ=', chain);
			
			expect(result.success).toBe(true);
			expect(result.data).toBe('Hello World');
			expect(result.steps).toHaveLength(1);
			expect(result.steps[0].success).toBe(true);
		});

		it('应该执行操作链', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-decode', config: {} },
				{ operationId: 'url-encode', config: {} }
			];
			
			const result = await processor.executeChain('SGVsbG8gV29ybGQ=', chain);
			
			expect(result.success).toBe(true);
			expect(result.data).toBe('Hello%20World');
			expect(result.steps).toHaveLength(2);
			expect(result.steps[0].success).toBe(true);
			expect(result.steps[1].success).toBe(true);
		});

		it('应该处理空操作链', async () => {
			const chain: OperationConfig[] = [];
			
			const result = await processor.executeChain('test input', chain);
			
			expect(result.success).toBe(true);
			expect(result.data).toBe('test input');
			expect(result.steps).toHaveLength(0);
		});
	});

	describe('错误处理', () => {
		it('应该处理操作失败', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-decode', config: {} },
				{ operationId: 'base64-decode', config: {} }
			];
			
			const result = await processor.executeChain('Invalid Base64!', chain);
			
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.steps).toHaveLength(1);
			expect(result.steps[0].success).toBe(false);
		});

		it('应该处理不存在的操作', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'non-existent-operation', config: {} }
			];
			
			const result = await processor.executeChain('test', chain);
			
			expect(result.success).toBe(false);
			expect(result.error).toContain('未找到操作');
		});

		it('应该在第一步失败后停止执行', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-decode', config: {} },
				{ operationId: 'url-encode', config: {} }
			];
			
			const result = await processor.executeChain('Invalid!', chain);
			
			expect(result.success).toBe(false);
			expect(result.steps).toHaveLength(1);
			expect(result.steps[1]).toBeUndefined();
		});
	});

	describe('进度报告', () => {
		it('应该提供执行进度', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-encode', config: {} },
				{ operationId: 'url-encode', config: {} }
			];
			
			const progressCallback = vi.fn();
			const result = await processor.executeChain('Hello', chain, {
				onProgress: progressCallback
			});
			
			expect(result.success).toBe(true);
			expect(progressCallback).toHaveBeenCalledTimes(2);
			expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 2);
			expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 2);
		});

		it('应该在失败时报告进度', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-decode', config: {} }
			];
			
			const progressCallback = vi.fn();
			const result = await processor.executeChain('Invalid!', chain, {
				onProgress: progressCallback
			});
			
			expect(result.success).toBe(false);
			expect(progressCallback).toHaveBeenCalled();
		});
	});

	describe('验证功能', () => {
		it('应该验证操作链', () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-encode', config: {} },
				{ operationId: 'non-existent', config: {} }
			];
			
			const validation = processor.validateChain(chain);
			
			expect(validation.valid).toBe(false);
			expect(validation.error).toContain('未找到操作');
		});

		it('应该接受有效的操作链', () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-encode', config: {} },
				{ operationId: 'url-encode', config: {} }
			];
			
			const validation = processor.validateChain(chain);
			
			expect(validation.valid).toBe(true);
		});

		it('应该接受空操作链', () => {
			const chain: OperationConfig[] = [];
			
			const validation = processor.validateChain(chain);
			
			expect(validation.valid).toBe(true);
		});
	});

	describe('复杂场景', () => {
		it('应该处理长操作链', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-encode', config: {} },
				{ operationId: 'url-encode', config: {} },
				{ operationId: 'base64-decode', config: {} }
			];
			
			const result = await processor.executeChain('Hello', chain);
			
			expect(result.success).toBe(false); // URL 编码后的 Base64 无法解码
			expect(result.steps).toHaveLength(3);
			expect(result.steps[0].success).toBe(true);
			expect(result.steps[1].success).toBe(true);
			expect(result.steps[2].success).toBe(false);
		});

		it('应该正确传递配置参数', async () => {
			const chain: OperationConfig[] = [
				{ operationId: 'base64-encode', config: {} }
			];
			
			const result = await processor.executeChain('test', chain);
			
			expect(result.success).toBe(true);
			expect(result.data).toBe('dGVzdA==');
		});
	});
});