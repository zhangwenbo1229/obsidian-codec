import { describe, expect, it } from 'vitest';
import {
	AddLineAffixOperation,
	AutoWrapOperation,
	DeduplicateOperation,
	FindReplaceOperation,
	JoinToSingleLineOperation,
	LineToSymbolOperation,
	LowerCaseOperation,
	RemoveWhitespaceOperation,
	SortLinesOperation,
	SwapCaseOperation,
	UpperCaseOperation
} from '../text-tools';

describe('FindReplaceOperation', () => {
	it('should replace all matching text', async () => {
		const operation = new FindReplaceOperation();
		const result = await operation.execute('foo bar foo', {
			find: 'foo',
			replaceWith: 'baz'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('baz bar baz');
	});

	it('should fail when find text is empty', async () => {
		const operation = new FindReplaceOperation();
		const result = await operation.execute('foo', {
			find: '',
			replaceWith: 'bar'
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('DeduplicateOperation', () => {
	it('should remove duplicate lines and keep first occurrence order', async () => {
		const operation = new DeduplicateOperation();
		const result = await operation.execute('b\na\nb\na\nc', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('b\na\nc');
	});
});

describe('SortLinesOperation', () => {
	it('should sort lines alphabetically', async () => {
		const operation = new SortLinesOperation();
		const result = await operation.execute('banana\nApple\ncherry', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('Apple\nbanana\ncherry');
	});
});

describe('AddLineAffixOperation', () => {
	it('should add text to the start of every line', async () => {
		const operation = new AddLineAffixOperation();
		const result = await operation.execute('a\nb', {
			position: 'start',
			text: '- ',
			deduplicate: false
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('- a\n- b');
	});

	it('should skip duplicate line endings when deduplicate is enabled', async () => {
		const operation = new AddLineAffixOperation();
		const result = await operation.execute('a;\nb', {
			position: 'end',
			text: ';',
			deduplicate: true
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('a;\nb;');
	});

	it('should not add duplicate line prefixes when deduplicate is enabled', async () => {
		const operation = new AddLineAffixOperation();
		const result = await operation.execute('https://123', {
			position: 'start',
			text: 'https://',
			deduplicate: true
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('https://123');
	});

	it('should normalize repeated prefixes when deduplicate is enabled', async () => {
		const operation = new AddLineAffixOperation();
		const result = await operation.execute('https://https://123', {
			position: 'start',
			text: 'https://',
			deduplicate: true
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('https://123');
	});
});

describe('CaseOperations', () => {
	it('should convert text to upper case', async () => {
		const operation = new UpperCaseOperation();
		const result = await operation.execute('abc Def', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('ABC DEF');
	});

	it('should convert text to lower case', async () => {
		const operation = new LowerCaseOperation();
		const result = await operation.execute('abc Def', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('abc def');
	});

	it('should swap letter case', async () => {
		const operation = new SwapCaseOperation();
		const result = await operation.execute('AbC 123', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('aBc 123');
	});
});

describe('WhitespaceAndLineOperations', () => {
	it('should remove whitespace', async () => {
		const operation = new RemoveWhitespaceOperation();
		const result = await operation.execute('a b\nc\t d', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('abcd');
	});

	it('should replace line breaks with configured symbol', async () => {
		const operation = new LineToSymbolOperation();
		const result = await operation.execute('a\nb\nc', { symbol: '|' });

		expect(result.success).toBe(true);
		expect(result.data).toBe('a|b|c');
	});

	it('should join lines into one line', async () => {
		const operation = new JoinToSingleLineOperation();
		const result = await operation.execute('a\nb\nc', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('a b c');
	});

	it('should wrap text by spaces', async () => {
		const operation = new AutoWrapOperation();
		const result = await operation.execute('a b  c', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('a\nb\nc');
	});
});
