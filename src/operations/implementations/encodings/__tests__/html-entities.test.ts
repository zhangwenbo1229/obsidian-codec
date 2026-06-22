import { describe, it, expect } from 'vitest';
import { HTMLEntityEncodeOperation } from '../html-entities';
import { HTMLEntityDecodeOperation } from '../html-entities';

describe('HTMLEntityEncodeOperation', () => {
	it('should encode html special characters', async () => {
		const operation = new HTMLEntityEncodeOperation();
		const result = await operation.execute('<div>Hello</div>', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('&lt;div&gt;Hello&lt;/div&gt;');
	});

	it('should encode quotes', async () => {
		const operation = new HTMLEntityEncodeOperation();
		const result = await operation.execute('"hello" & \'world\'', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('&quot;hello&quot; &amp; &apos;world&apos;');
	});

	it('should encode common symbols', async () => {
		const operation = new HTMLEntityEncodeOperation();
		const result = await operation.execute('< > & " \'', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('&lt; &gt; &amp; &quot; &apos;');
	});

	it('should handle empty string', async () => {
		const operation = new HTMLEntityEncodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should have correct metadata', () => {
		const operation = new HTMLEntityEncodeOperation();
		expect(operation.id).toBe('html-entity-encode');
		expect(operation.name).toBe('HTML 实体编码');
		expect(operation.category).toBe('encoding');
		expect(operation.description).toBeDefined();
	});
});

describe('HTMLEntityDecodeOperation', () => {
	it('should decode html entities', async () => {
		const operation = new HTMLEntityDecodeOperation();
		const result = await operation.execute('&lt;div&gt;Hello&lt;/div&gt;', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('<div>Hello</div>');
	});

	it('should decode quotes', async () => {
		const operation = new HTMLEntityDecodeOperation();
		const result = await operation.execute('&quot;hello&quot; &amp; &apos;world&apos;', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('"hello" & \'world\'');
	});

	it('should decode common symbols', async () => {
		const operation = new HTMLEntityDecodeOperation();
		const result = await operation.execute('&lt; &gt; &amp; &quot; &apos;', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('< > & " \'');
	});

	it('should handle empty string', async () => {
		const operation = new HTMLEntityDecodeOperation();
		const result = await operation.execute('', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('');
	});

	it('should handle malformed entities', async () => {
		const operation = new HTMLEntityDecodeOperation();
		const result = await operation.execute('&lt;div&gt;&invalid;&lt;/div&gt;', {});
		expect(result.success).toBe(true);
		expect(result.data).toBe('<div>&invalid;</div>');
	});

	it('should have correct metadata', () => {
		const operation = new HTMLEntityDecodeOperation();
		expect(operation.id).toBe('html-entity-decode');
		expect(operation.name).toBe('HTML 实体解码');
		expect(operation.category).toBe('decoding');
		expect(operation.description).toBeDefined();
	});
});
