import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import { ValidationResult } from '../../../types';

export interface DateToTimestampConfig {
	outputFormat: 'seconds' | 'milliseconds';
}

export class DateToTimestampOperation extends BaseOperation {
	id = 'date-to-timestamp';
	name = '日期转时间戳';
	category = OperationCategory.DATETIME;
	description = '将日期字符串转换为时间戳';

	protected validateInput(input: string): ValidationResult {
		const trimmed = input.trim();
		
		if (!trimmed) {
			return { valid: false, error: '请输入日期字符串' };
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const trimmed = input.trim();
		const operationConfig = config as unknown as Partial<DateToTimestampConfig>;
		
		let date: Date;
		
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
			date = new Date(trimmed);
		}
		else if (/^\d{4}年\d{1,2}月\d{1,2}日/.test(trimmed) || /^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
			const match = trimmed.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})/);
			if (match) {
				const year = match[1] || '0';
				const month = match[2] || '1';
				const day = match[3] || '1';
				const timeMatch = trimmed.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
				if (timeMatch) {
					const hours = timeMatch[1] || '0';
					const minutes = timeMatch[2] || '0';
					const seconds = timeMatch[3] || '0';
					date = new Date(
						parseInt(year), 
						parseInt(month) - 1, 
						parseInt(day),
						parseInt(hours || '0'),
						parseInt(minutes || '0'),
						parseInt(seconds || '0')
					);
				} else {
					date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
				}
			} else {
				date = new Date(trimmed);
			}
		}
		else if (/^\d+$/.test(trimmed)) {
			const num = parseInt(trimmed, 10);
			if (trimmed.length === 10) {
				return operationConfig.outputFormat === 'milliseconds' 
					? String(num * 1000)
					: String(num);
			} else if (trimmed.length === 13) {
				return operationConfig.outputFormat === 'seconds'
					? String(Math.floor(num / 1000))
					: String(num);
			}
			return String(num);
		}
		else {
			date = new Date(trimmed);
		}

		if (isNaN(date.getTime())) {
			throw new Error('无法解析日期格式');
		}

		const milliseconds = date.getTime();
		
		if (operationConfig.outputFormat === 'seconds') {
			return String(Math.floor(milliseconds / 1000));
		} else {
			return String(milliseconds);
		}
	}

	getConfigUI(): string {
		return `
			<div class="codec-config-section">
				<label class="codec-config-label">输出格式：</label>
				<select class="codec-timestamp-output-format" data-config-key="outputFormat">
					<option value="milliseconds">毫秒 (13位)</option>
					<option value="seconds">秒 (10位)</option>
				</select>
			</div>
			<div class="codec-config-section">
				<div class="codec-config-hint">
					支持格式：ISO 8601 (2024-01-15T12:30:45) | 中文日期 (2024年1月15日) | 时间戳 | 自然语言
				</div>
			</div>
		`;
	}
}
