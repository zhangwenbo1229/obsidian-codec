import { describe, expect, it } from 'vitest';
import {
	ExtractDomainOperation,
	ExtractIPv4Operation,
	ExtractLineCountOperation,
	ExtractStringOperation,
	ExtractUrlOperation
} from '../extract-tools';

describe('ExtractStringOperation', () => {
	it('should extract string tokens without requiring quotes', async () => {
		const operation = new ExtractStringOperation();
		const result = await operation.execute('alpha "beta" gamma,', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('alpha\nbeta\ngamma');
	});
});

describe('ExtractLineCountOperation', () => {
	it('should output input line count', async () => {
		const operation = new ExtractLineCountOperation();
		const result = await operation.execute('one\ntwo\nthree', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('3');
	});
});

describe('ExtractIPv4Operation', () => {
	it('should extract valid IPv4 values only', async () => {
		const operation = new ExtractIPv4Operation();
		const result = await operation.execute('valid 192.168.1.1 invalid 999.1.1.1 also 8.8.8.8', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('192.168.1.1\n8.8.8.8');
	});
});

describe('ExtractUrlOperation', () => {
	it('should extract http and https URLs', async () => {
		const operation = new ExtractUrlOperation();
		const result = await operation.execute('Open https://example.com/a?b=1, then http://test.example/path.', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('https://example.com/a?b=1\nhttp://test.example/path');
	});
});

describe('ExtractDomainOperation', () => {
	it('should extract domain values', async () => {
		const operation = new ExtractDomainOperation();
		const result = await operation.execute('Visit Example.COM and sub.domain.org, not localhost.', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('example.com\nsub.domain.org');
	});
});
