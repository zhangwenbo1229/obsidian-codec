import { describe, expect, it } from 'vitest';
import {
	BinaryDecodeOperation,
	BinaryEncodeOperation,
	DecimalDecodeOperation,
	DecimalEncodeOperation
} from '../numeric';

describe('BinaryEncodeOperation', () => {
	it('should encode text to binary bytes', async () => {
		const operation = new BinaryEncodeOperation();
		const result = await operation.execute('Hi', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('01001000 01101001');
	});

	it('should encode unicode text as UTF-8 bytes', async () => {
		const operation = new BinaryEncodeOperation();
		const result = await operation.execute('你', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('11100100 10111101 10100000');
	});
});

describe('BinaryDecodeOperation', () => {
	it('should decode binary bytes to text', async () => {
		const operation = new BinaryDecodeOperation();
		const result = await operation.execute('01001000 01101001', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('Hi');
	});

	it('should reject invalid binary tokens', async () => {
		const operation = new BinaryDecodeOperation();
		const result = await operation.execute('01001002', {});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('DecimalEncodeOperation', () => {
	it('should encode text to decimal bytes', async () => {
		const operation = new DecimalEncodeOperation();
		const result = await operation.execute('Hi', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('72 105');
	});
});

describe('DecimalDecodeOperation', () => {
	it('should decode decimal bytes to text', async () => {
		const operation = new DecimalDecodeOperation();
		const result = await operation.execute('72 105', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('Hi');
	});

	it('should reject values outside byte range', async () => {
		const operation = new DecimalDecodeOperation();
		const result = await operation.execute('72 300', {});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
