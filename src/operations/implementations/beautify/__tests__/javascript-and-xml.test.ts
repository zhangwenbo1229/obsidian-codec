import { describe, expect, it } from 'vitest';
import { JavaScriptMinifyOperation, JavaScriptPrettifyOperation } from '../javascript';
import { XmlMinifyOperation } from '../xml-minify';

describe('JavaScriptPrettifyOperation', () => {
	it('should beautify javascript input', async () => {
		const operation = new JavaScriptPrettifyOperation();
		const result = await operation.execute('function test(){return 1;}', {});

		expect(result.success).toBe(true);
		expect(result.data).toContain('function test()');
		expect(result.data).toContain('return 1;');
	});
});

describe('JavaScriptMinifyOperation', () => {
	it('should minify javascript input', async () => {
		const operation = new JavaScriptMinifyOperation();
		const result = await operation.execute('function test() { return 1; }', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('function test(){return 1;}');
	});
});

describe('XmlMinifyOperation', () => {
	it('should minify xml input', async () => {
		const operation = new XmlMinifyOperation();
		const result = await operation.execute('<root>\n  <item> 1 </item>\n</root>', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('<root><item>1</item></root>');
	});
});
