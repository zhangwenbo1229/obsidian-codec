import { describe, expect, it } from 'vitest';
import { FromUtf8Operation, ToUtf8Operation } from '../charset-converter';

describe('charset converter ASCII support', () => {
	it('should convert ASCII source text to UTF-8 text', async () => {
		const operation = new ToUtf8Operation();
		const result = await operation.execute('Hello 123', {
			sourceCharset: 'ascii'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello 123');
	});

	it('should replace non-ASCII characters when converting from UTF-8 to ASCII', async () => {
		const operation = new FromUtf8Operation();
		const result = await operation.execute('Hello 你好', {
			targetCharset: 'ascii'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('Hello ??');
	});
});
