import { describe, it, expect } from 'vitest';
import { JWTDecodeOperation } from '../jwt';

describe('JWTDecodeOperation', () => {
	it('should decode simple JWT token', async () => {
		const operation = new JWTDecodeOperation();
		const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJAdPexQBW6sg';
		const result = await operation.execute(jwt, {});
		expect(result.success).toBe(true);
		
		const parsed = JSON.parse(result.data);
		expect(parsed.header).toBeDefined();
		expect(parsed.payload).toBeDefined();
		expect(parsed.payload.sub).toBe('1234567890');
		expect(parsed.payload.name).toBe('John Doe');
	});

	it('should decode JWT with custom payload', async () => {
		const operation = new JWTDecodeOperation();
		const payload = btoa(JSON.stringify({ user: 'test', role: 'admin' }));
		const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;
		const result = await operation.execute(jwt, {});
		expect(result.success).toBe(true);
		
		const parsed = JSON.parse(result.data);
		expect(parsed.payload.user).toBe('test');
		expect(parsed.payload.role).toBe('admin');
	});

	it('should handle empty string', async () => {
		const operation = new JWTDecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should handle malformed JWT', async () => {
		const operation = new JWTDecodeOperation();
		const result = await operation.execute('not-a-jwt', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should handle JWT without proper parts', async () => {
		const operation = new JWTDecodeOperation();
		const result = await operation.execute('only.two.parts', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should handle JWT with invalid base64', async () => {
		const operation = new JWTDecodeOperation();
		const result = await operation.execute('header.payload.not-valid-base64!@#', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should have correct metadata', () => {
		const operation = new JWTDecodeOperation();
		expect(operation.id).toBe('jwt-decode');
		expect(operation.name).toBe('JWT 解析');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});