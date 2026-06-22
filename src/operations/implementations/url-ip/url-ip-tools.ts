import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

const MAX_CIDR_RESULTS = 65536;
type IpFormat = 'dotted' | 'decimal' | 'hex' | 'octal';

function validateRequiredInput(input: string): ValidationResult {
	if (!input) {
		return { valid: false, error: '请输入要处理的内容' };
	}
	return { valid: true };
}

function ipToNumber(ip: string): number | null {
	const parts = ip.split('.');
	if (parts.length !== 4) {
		return null;
	}

	let result = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) {
			return null;
		}
		const value = Number(part);
		if (!Number.isInteger(value) || value < 0 || value > 255) {
			return null;
		}
		result = (result << 8) + value;
	}

	return result >>> 0;
}

function numberToIp(value: number): string {
	return [
		(value >>> 24) & 255,
		(value >>> 16) & 255,
		(value >>> 8) & 255,
		value & 255
	].join('.');
}

function parseIpValue(input: string, format: IpFormat): number | null {
	const value = input.trim();
	if (!value) {
		return null;
	}

	if (format === 'dotted') {
		return ipToNumber(value);
	}

	const normalized = value.replace(/^0x/i, '');
	let parsed: number;
	if (format === 'decimal') {
		if (!/^\d+$/.test(normalized)) {
			return null;
		}
		parsed = Number(normalized);
	} else if (format === 'hex') {
		if (!/^[0-9a-f]+$/i.test(normalized)) {
			return null;
		}
		parsed = parseInt(normalized, 16);
	} else {
		if (!/^[0-7]+$/.test(normalized)) {
			return null;
		}
		parsed = parseInt(normalized, 8);
	}

	if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffffffff) {
		return null;
	}

	return parsed >>> 0;
}

function formatIpValue(value: number, format: IpFormat): string {
	if (format === 'dotted') {
		return numberToIp(value);
	}
	if (format === 'decimal') {
		return String(value >>> 0);
	}
	if (format === 'hex') {
		return `0x${(value >>> 0).toString(16).padStart(8, '0')}`;
	}
	return (value >>> 0).toString(8).padStart(11, '0');
}

function normalizeIpFormat(value: unknown): IpFormat {
	if (value === 'decimal' || value === 'hex' || value === 'octal') {
		return value;
	}
	return 'dotted';
}

function normalizeHost(input: string): string {
	const trimmed = input.trim().replace(/\\/g, '/');
	const withoutProtocol = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
	const withoutPath = withoutProtocol.split(/[/?#]/)[0] ?? '';
	return withoutPath
		.replace(/:\d+$/g, '')
		.toLowerCase()
		.replace(/^\.+|\.+$/g, '');
}

function getRootDomain(host: string): string | null {
	const normalized = normalizeHost(host);
	if (!normalized || ipToNumber(normalized) !== null) {
		return null;
	}

	const labels = normalized.split('.').filter(Boolean);
	if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
		return null;
	}

	return labels.slice(-2).join('.');
}

export class RemoveProtocolOperation extends BaseOperation {
	id = 'remove-protocol';
	name = '去协议头';
	category = OperationCategory.URL_IP;
	description = '去除输入中开头的 URL 协议头';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.replace(/\b[a-z][a-z0-9+.-]*:\/\//gi, '');
	}
}

export class RemovePortOperation extends BaseOperation {
	id = 'remove-port';
	name = '去端口';
	category = OperationCategory.URL_IP;
	description = '去除输入中的端口号';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		return input.replace(/(^|[/:@\s])(\d{1,3}(?:\.\d{1,3}){3}|[a-z0-9.-]+):\d{1,5}\b/gi, '$1$2');
	}
}

export class ExtractRootDomainOperation extends BaseOperation {
	id = 'extract-root-domain';
	name = '提取根域名';
	category = OperationCategory.URL_IP;
	description = '从子域名或 URL 中提取根域名并去重';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string): Promise<string> {
		const tokens = input.split(/[\s,;]+/).filter(Boolean);
		const domains = tokens
			.map(token => getRootDomain(token))
			.filter((domain): domain is string => Boolean(domain));

		return Array.from(new Set(domains)).join('\n');
	}
}

export class ExpandCidrOperation extends BaseOperation {
	id = 'expand-cidr';
	name = '展开CIDR';
	category = OperationCategory.URL_IP;
	description = '展开 CIDR IP 段并输出所有 IPv4 地址';

	protected validateInput(input: string): ValidationResult {
		const required = validateRequiredInput(input);
		if (!required.valid) {
			return required;
		}

		const cidrs = input.split(/[\s,;]+/).filter(Boolean);
		for (const cidr of cidrs) {
			const match = cidr.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d|[12]\d|3[0-2])$/);
			if (!match) {
				return { valid: false, error: `无效的 CIDR: ${cidr}` };
			}
			const [, ipPart, prefixPart] = match;
			if (!ipPart || !prefixPart) {
				return { valid: false, error: `无效的 CIDR: ${cidr}` };
			}
			if (ipToNumber(ipPart) === null) {
				return { valid: false, error: `无效的 IPv4 地址: ${ipPart}` };
			}
			const prefix = Number(prefixPart);
			const size = 2 ** (32 - prefix);
			if (size > MAX_CIDR_RESULTS) {
				return { valid: false, error: `CIDR 范围过大，最多展开 ${MAX_CIDR_RESULTS} 个地址` };
			}
		}

		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		const result: string[] = [];
		const cidrs = input.split(/[\s,;]+/).filter(Boolean);

		for (const cidr of cidrs) {
			const match = cidr.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d|[12]\d|3[0-2])$/);
			if (!match) {
				continue;
			}

			const [, ipPart, prefixPart] = match;
			if (!ipPart || !prefixPart) {
				continue;
			}

			const ip = ipToNumber(ipPart);
			if (ip === null) {
				continue;
			}

			const prefix = Number(prefixPart);
			const size = 2 ** (32 - prefix);
			const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
			const start = ip & mask;

			for (let offset = 0; offset < size; offset++) {
				result.push(numberToIp((start + offset) >>> 0));
			}
		}

		return result.join('\n');
	}
}

export class ConvertIpFormatOperation extends BaseOperation {
	id = 'convert-ip-format';
	name = 'IP地址格式转换';
	category = OperationCategory.URL_IP;
	description = '在点分十进制、十进制、十六进制、八进制之间转换 IPv4 地址格式';

	protected validateInput(input: string): ValidationResult {
		return validateRequiredInput(input);
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const inputFormat = normalizeIpFormat(config.inputFormat);
		const outputFormat = normalizeIpFormat(config.outputFormat);

		return input
			.split(/\r?\n/)
			.map(line => {
				if (!line.trim()) {
					return '';
				}

				const value = parseIpValue(line, inputFormat);
				if (value === null) {
					throw new Error(`无效的 IP 地址��式: ${line}`);
				}

				return formatIpValue(value, outputFormat);
			})
			.join('\n');
	}

	getConfigUI(): string {
		return 'convert-ip-format';
	}
}
