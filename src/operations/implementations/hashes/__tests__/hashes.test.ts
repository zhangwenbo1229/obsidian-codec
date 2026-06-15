import { describe, it, expect } from 'vitest';
import { MD5Operation } from '../md5';
import { SHA1Operation } from '../sha1';
import { SHA256Operation } from '../sha256';
import { SHA512Operation } from '../sha512';

describe('MD5Operation', () => {
	it('should hash text to MD5', async () => {
		const operation = new MD5Operation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('b10a8db164e0754105b7a99be72e3fe5');
	});

	it('should hash empty string', async () => {
		const operation = new MD5Operation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('d41d8cd98f00b204e9800998ecf8427e');
	});

	it('should produce consistent hashes', async () => {
		const operation = new MD5Operation();
		const result1 = await operation.execute('test', {});
		const result2 = await operation.execute('test', {});
		expect(result1.data).toBe(result2.data);
	});

	it('should have correct metadata', () => {
		const operation = new MD5Operation();
		expect(operation.id).toBe('md5');
		expect(operation.name).toBe('MD5 哈希');
		expect(operation.category).toBe('hash');
		expect(operation.description).toBeDefined();
	});
});

describe('SHA1Operation', () => {
	it('should hash text to SHA1', async () => {
		const operation = new SHA1Operation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('0a4d55a8d778e5022fab701977c5d840bbc486d0');
	});

	it('should hash empty string', async () => {
		const operation = new SHA1Operation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
	});

	it('should have correct metadata', () => {
		const operation = new SHA1Operation();
		expect(operation.id).toBe('sha1');
		expect(operation.name).toBe('SHA1 哈希');
		expect(operation.category).toBe('hash');
	});
});

describe('SHA256Operation', () => {
	it('should hash text to SHA256', async () => {
		const operation = new SHA256Operation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
	});

	it('should hash empty string', async () => {
		const operation = new SHA256Operation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
	});

	it('should have correct metadata', () => {
		const operation = new SHA256Operation();
		expect(operation.id).toBe('sha256');
		expect(operation.name).toBe('SHA256 哈希');
		expect(operation.category).toBe('hash');
	});
});

describe('SHA512Operation', () => {
	it('should hash text to SHA512', async () => {
		const operation = new SHA512Operation();
		const result = await operation.execute('Hello World', {});
		expect(result.success).toBe(true);
		expect(result.data.length).toBe(128);
	});

	it('should hash empty string', async () => {
		const operation = new SHA512Operation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e');
	});

	it('should have correct metadata', () => {
		const operation = new SHA512Operation();
		expect(operation.id).toBe('sha512');
		expect(operation.name).toBe('SHA512 哈希');
		expect(operation.category).toBe('hash');
	});
});