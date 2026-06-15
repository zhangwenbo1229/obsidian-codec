import { describe, it, expect, beforeEach } from 'vitest';
import { BaseOperation } from '../base-operation';
import { OperationCategory, OperationResult, ValidationResult } from '../../types';

class ConcreteOperation extends BaseOperation {
	id = 'test-operation';
	name = 'Test Operation';
	category = OperationCategory.ENCODING;
	description = 'A test operation';

	private shouldFail = false;
	private customError: string | null = null;

	setFailCondition(shouldFail: boolean, error?: string) {
		this.shouldFail = shouldFail;
		this.customError = error || null;
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		if (this.shouldFail) {
			throw new Error(this.customError || 'Execution failed');
		}
		return input.toUpperCase();
	}

	protected validateInput(input: string): ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: 'Input cannot be empty' };
		}
		if (input.length > 1000) {
			return { valid: false, error: 'Input too long' };
		}
		return { valid: true };
	}
}

describe('BaseOperation', () => {
	let operation: ConcreteOperation;

	beforeEach(() => {
		operation = new ConcreteOperation();
	});

	describe('execute', () => {
		it('should successfully execute operation', async () => {
			const result = await operation.execute('hello world', {});
			
			expect(result.success).toBe(true);
			expect(result.data).toBe('HELLO WORLD');
			expect(result.error).toBeUndefined();
		});

		it('should fail validation for empty input', async () => {
			const result = await operation.execute('', {});
			
			expect(result.success).toBe(false);
			expect(result.data).toBe('');
			expect(result.error).toBe('Input cannot be empty');
		});

		it('should fail validation for whitespace-only input', async () => {
			const result = await operation.execute('   ', {});
			
			expect(result.success).toBe(false);
			expect(result.error).toBe('Input cannot be empty');
		});

		it('should fail validation for too long input', async () => {
			const longInput = 'a'.repeat(1001);
			const result = await operation.execute(longInput, {});
			
			expect(result.success).toBe(false);
			expect(result.error).toBe('Input too long');
		});

		it('should handle execution errors', async () => {
			operation.setFailCondition(true, 'Custom execution error');
			
			const result = await operation.execute('test', {});
			
			expect(result.success).toBe(false);
			expect(result.data).toBe('');
			expect(result.error).toBe('Custom execution error');
		});

		it('should handle unknown execution errors', async () => {
			operation.setFailCondition(true);
			
			const result = await operation.execute('test', {});
			
			expect(result.success).toBe(false);
			expect(result.error).toBe('Execution failed');
		});

		it('should pass config to executeLogic', async () => {
			const configOperation = new class extends BaseOperation {
				id = 'config-test';
				name = 'Config Test';
				category = OperationCategory.ENCODING;
				description = 'Test config passing';

				protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
					const prefix = config.prefix as string || '';
					return prefix + input;
				}

				protected validateInput(input: string): ValidationResult {
					return { valid: true };
				}
			}();

			const result = await configOperation.execute('test', { prefix: 'PREFIX_' });
			expect(result.success).toBe(true);
			expect(result.data).toBe('PREFIX_test');
		});
	});

	describe('validate', () => {
		it('should validate valid input', () => {
			const result = operation.validate('valid input');
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should invalidate empty input', () => {
			const result = operation.validate('');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Input cannot be empty');
		});

		it('should invalidate too long input', () => {
			const result = operation.validate('a'.repeat(1001));
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Input too long');
		});
	});

	describe('getConfigUI', () => {
		it('should return empty string by default', () => {
			const ui = operation.getConfigUI?.();
			expect(ui).toBe('');
		});
	});

	describe('operation properties', () => {
		it('should have correct id', () => {
			expect(operation.id).toBe('test-operation');
		});

		it('should have correct name', () => {
			expect(operation.name).toBe('Test Operation');
		});

		it('should have correct category', () => {
			expect(operation.category).toBe(OperationCategory.ENCODING);
		});

		it('should have correct description', () => {
			expect(operation.description).toBe('A test operation');
		});
	});
});