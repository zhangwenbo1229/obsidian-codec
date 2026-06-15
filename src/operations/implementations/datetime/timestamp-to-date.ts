import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import { ValidationResult } from '../../../types';

export interface TimestampToDateConfig {
	format: 'iso' | 'locale' | 'custom';
	customFormat?: string;
	timezone?: string;
}

export class TimestampToDateOperation extends BaseOperation {
	id = 'timestamp-to-date';
	name = '时间戳转日期';
	category = OperationCategory.DATETIME;
	description = '将时间戳转换为可读日期格式';

	protected validateInput(input: string): ValidationResult {
		const timestamp = input.trim();
		
		if (!timestamp) {
			return { valid: false, error: '请输入时间戳' };
		}
		
		if (!/^\d+$/.test(timestamp)) {
			return { valid: false, error: '时间戳必须为数字' };
		}
		
		const num = parseInt(timestamp, 10);
		if (timestamp.length !== 10 && timestamp.length !== 13) {
			return { valid: false, error: '时间戳应为10位(秒)或13位(毫秒)' };
		}
		
		const minTimestamp = 0;
		const maxTimestamp = timestamp.length === 10 ? 4102444800 : 4102444800000;
		if (num < minTimestamp || num > maxTimestamp) {
			return { valid: false, error: '时间戳超出合理范围' };
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		const timestamp = input.trim();
		const operationConfig = config as TimestampToDateConfig;
		
		const milliseconds = timestamp.length === 10 
			? parseInt(timestamp, 10) * 1000 
			: parseInt(timestamp, 10);
		
		const date = new Date(milliseconds);
		
		switch (operationConfig.format) {
			case 'iso':
				return date.toISOString();
				
			case 'locale':
				return date.toLocaleString('zh-CN', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false
				});
				
			case 'custom':
				return this.formatCustom(date, operationConfig.customFormat || 'YYYY-MM-DD HH:mm:ss');
				
			default:
				return date.toLocaleString('zh-CN');
		}
	}

	private formatCustom(date: Date, format: string): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

		return format
			.replace('YYYY', String(year))
			.replace('MM', month)
			.replace('DD', day)
			.replace('HH', hours)
			.replace('mm', minutes)
			.replace('ss', seconds)
			.replace('SSS', milliseconds);
	}

	getConfigUI(): string {
		return `
			<div class="codec-config-section">
				<label class="codec-config-label">输出格式：</label>
				<select class="codec-timestamp-output-format" data-config-key="format">
					<option value="iso">ISO 8601 格式</option>
					<option value="locale">本地日期时间</option>
					<option value="custom">自定义格式</option>
				</select>
			</div>
			<div class="codec-config-section codec-custom-format-section" style="display: none;">
				<label class="codec-config-label">自定义格式：</label>
				<input type="text" class="codec-custom-format-input" data-config-key="customFormat" 
					   placeholder="YYYY-MM-DD HH:mm:ss" value="YYYY-MM-DD HH:mm:ss"/>
				<div class="codec-config-hint">
					支持占位符：YYYY(年份) MM(月份) DD(日期) HH(小时) mm(分钟) ss(秒) SSS(毫秒)
				</div>
			</div>
		`;
	}
}
