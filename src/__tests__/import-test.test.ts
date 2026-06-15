import { describe, it, expect } from 'vitest';
import { OperationCategory } from '../types';

describe('Import Test', () => {
	it('should import OperationCategory', () => {
		expect(OperationCategory).toBeDefined();
		expect(OperationCategory.ENCODING).toBe('encoding');
	});
	
	it('should have all category values', () => {
		expect(OperationCategory.ENCODING).toBe('encoding');
		expect(OperationCategory.DECODING).toBe('decoding');
		expect(OperationCategory.HASH).toBe('hash');
		expect(OperationCategory.ENCRYPTION).toBe('encryption');
		expect(OperationCategory.DECRYPTION).toBe('decryption');
		expect(OperationCategory.CUSTOM).toBe('custom');
	});
});