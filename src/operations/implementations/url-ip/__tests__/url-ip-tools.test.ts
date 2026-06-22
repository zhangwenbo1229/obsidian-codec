import { describe, expect, it } from 'vitest';
import {
	ConvertIpFormatOperation,
	ExpandCidrOperation,
	ExtractRootDomainOperation,
	RemovePortOperation,
	RemoveProtocolOperation
} from '../url-ip-tools';

describe('RemoveProtocolOperation', () => {
	it('should remove URL protocol prefixes', async () => {
		const operation = new RemoveProtocolOperation();
		const result = await operation.execute('https://example.com http://test.com ftp://files.example.com', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('example.com test.com files.example.com');
	});
});

describe('RemovePortOperation', () => {
	it('should remove port numbers from hosts and IPs', async () => {
		const operation = new RemovePortOperation();
		const result = await operation.execute('example.com:443 http://10.0.0.1:80/path', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('example.com http://10.0.0.1/path');
	});
});

describe('ExtractRootDomainOperation', () => {
	it('should extract unique root domains from subdomains and URLs', async () => {
		const operation = new ExtractRootDomainOperation();
		const result = await operation.execute('www.baidu.com map.baidu.com https://news.example.org/a', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('baidu.com\nexample.org');
	});
});

describe('ExpandCidrOperation', () => {
	it('should expand IPv4 CIDR ranges', async () => {
		const operation = new ExpandCidrOperation();
		const result = await operation.execute('10.0.0.0/30', {});

		expect(result.success).toBe(true);
		expect(result.data).toBe('10.0.0.0\n10.0.0.1\n10.0.0.2\n10.0.0.3');
	});

	it('should reject overly large CIDR ranges', async () => {
		const operation = new ExpandCidrOperation();
		const result = await operation.execute('10.0.0.0/8', {});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('ConvertIpFormatOperation', () => {
	it('should convert dotted decimal IPs to decimal', async () => {
		const operation = new ConvertIpFormatOperation();
		const result = await operation.execute('192.168.1.1', {
			inputFormat: 'dotted',
			outputFormat: 'decimal'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('3232235777');
	});

	it('should convert hex IPs to dotted decimal', async () => {
		const operation = new ConvertIpFormatOperation();
		const result = await operation.execute('0xc0a80101', {
			inputFormat: 'hex',
			outputFormat: 'dotted'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('192.168.1.1');
	});

	it('should convert dotted decimal IPs to octal', async () => {
		const operation = new ConvertIpFormatOperation();
		const result = await operation.execute('192.168.1.1', {
			inputFormat: 'dotted',
			outputFormat: 'octal'
		});

		expect(result.success).toBe(true);
		expect(result.data).toBe('30052000401');
	});
});
