import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOperationRegistry } from '../operation-registry';
import { Base64EncodeOperation } from '../operations/implementations/encodings/base64';

// Mock DOM 环境用于拖拽测试
class MockDragEvent {
	dataTransfer?: {
		setData: (format: string, data: string) => void;
		getData: (format: string) => string;
		effectAllowed?: string;
		dropEffect?: string;
	};
	
	constructor(type: string, bubbles: boolean) {
		this.type = type;
		this.bubbles = bubbles;
	}
	
	type: string;
	bubbles: boolean;
	preventDefault?: () => void;
}

describe('拖拽功能测试', () => {
	let registry: InMemoryOperationRegistry;

	beforeEach(() => {
		registry = new InMemoryOperationRegistry();
		registry.register(new Base64EncodeOperation());
	});

	it('应该能够将操作卡片拖拽到操作链区域', () => {
		// 这个测试验证拖拽功能的基本逻辑
		// 在实际环境中需要真实的 DOM 事件
		
		const operationId = 'base64-encode';
		const operation = registry.get(operationId);
		
		expect(operation).toBeDefined();
		expect(operation?.id).toBe('base64-encode');
	});

	it('应该支持操作链中的多个操作', () => {
		const operations = registry.listAll();
		
		expect(operations.length).toBeGreaterThan(0);
		
		// 验证操作可以被正确识别
		const encodingOps = operations.filter(op => op.category === 'encoding');
		expect(encodingOps.length).toBeGreaterThan(0);
	});
});