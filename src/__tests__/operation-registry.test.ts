import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOperationRegistry } from '../operation-registry';
import { Operation } from '../operations/interfaces';
import { OperationCategory, OperationResult, ValidationResult } from '../types';

class MockOperation implements Operation {
	id: string;
	name: string;
	category: OperationCategory;
	description: string;

	constructor(id: string, name: string, category: OperationCategory) {
		this.id = id;
		this.name = name;
		this.category = category;
		this.description = `Mock operation ${name}`;
	}

	async execute(input: string, config: Record<string, unknown>): Promise<OperationResult> {
		return { success: true, data: input };
	}

	validate(input: string): ValidationResult {
		return { valid: true };
	}
}

describe('InMemoryOperationRegistry', () => {
	let registry: InMemoryOperationRegistry;
	let mockOperation1: MockOperation;
	let mockOperation2: MockOperation;

	beforeEach(() => {
		registry = new InMemoryOperationRegistry();
		mockOperation1 = new MockOperation('test-op-1', 'Test Operation 1', OperationCategory.ENCODING);
		mockOperation2 = new MockOperation('test-op-2', 'Test Operation 2', OperationCategory.HASH);
	});

	describe('register', () => {
		it('should register an operation', () => {
			registry.register(mockOperation1);
			expect(registry.get('test-op-1')).toBe(mockOperation1);
		});

		it('should throw error when registering duplicate operation', () => {
			registry.register(mockOperation1);
			expect(() => registry.register(mockOperation1)).toThrow('Operation with id "test-op-1" already registered');
		});
	});

	describe('unregister', () => {
		it('should unregister an operation', () => {
			registry.register(mockOperation1);
			registry.unregister('test-op-1');
			expect(registry.get('test-op-1')).toBeUndefined();
		});

		it('should throw error when unregistering non-existent operation', () => {
			expect(() => registry.unregister('non-existent')).toThrow('Operation with id "non-existent" not found');
		});
	});

	describe('get', () => {
		it('should return operation by id', () => {
			registry.register(mockOperation1);
			const operation = registry.get('test-op-1');
			expect(operation).toBe(mockOperation1);
		});

		it('should return undefined for non-existent operation', () => {
			expect(registry.get('non-existent')).toBeUndefined();
		});
	});

	describe('getByCategory', () => {
		it('should return operations by category', () => {
			registry.register(mockOperation1); // ENCODING
			registry.register(mockOperation2); // HASH
			
			const encodingOps = registry.getByCategory(OperationCategory.ENCODING);
			const hashOps = registry.getByCategory(OperationCategory.HASH);
			
			expect(encodingOps).toHaveLength(1);
			expect(encodingOps[0]).toBe(mockOperation1);
			expect(hashOps).toHaveLength(1);
			expect(hashOps[0]).toBe(mockOperation2);
		});

		it('should return empty array for category with no operations', () => {
			const operations = registry.getByCategory(OperationCategory.DECODING);
			expect(operations).toEqual([]);
		});
	});

	describe('search', () => {
		it('should search operations by name', () => {
			registry.register(mockOperation1);
			registry.register(mockOperation2);
			
			const results = registry.search('Test Operation 1');
			expect(results).toHaveLength(1);
			expect(results[0]).toBe(mockOperation1);
		});

		it('should search operations by description', () => {
			registry.register(mockOperation1);
			
			const results = registry.search('Mock operation');
			expect(results).toHaveLength(1);
		});

		it('should search operations by id', () => {
			registry.register(mockOperation1);
			
			const results = registry.search('test-op-1');
			expect(results).toHaveLength(1);
		});

		it('should be case insensitive', () => {
			registry.register(mockOperation1);
			
			const results = registry.search('test operation 1');
			expect(results).toHaveLength(1);
		});

		it('should return empty array when no matches found', () => {
			registry.register(mockOperation1);
			
			const results = registry.search('non-existent');
			expect(results).toEqual([]);
		});
	});

	describe('listAll', () => {
		it('should return all registered operations', () => {
			registry.register(mockOperation1);
			registry.register(mockOperation2);
			
			const allOperations = registry.listAll();
			expect(allOperations).toHaveLength(2);
			expect(allOperations).toContain(mockOperation1);
			expect(allOperations).toContain(mockOperation2);
		});

		it('should return empty array when no operations registered', () => {
			const allOperations = registry.listAll();
			expect(allOperations).toEqual([]);
		});
	});
});