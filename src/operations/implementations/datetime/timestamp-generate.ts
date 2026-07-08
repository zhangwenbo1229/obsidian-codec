import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class TimestampGenerateOperation extends BaseOperation {
	id = 'timestamp-generate';
	name = '时间戳生成';
	category = OperationCategory.DATETIME;
	description = '生成当前时间的时间戳';

	// 默认配置
	private defaultUnit = 'ms'; // 毫秒
	private defaultTimezone = 'Asia/Shanghai'; // 北京时间

	protected validateInput(input: string): import('../../../types').ValidationResult {
		// 时间戳生成不依赖输入，总是有效
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			// 获取配置参数
			const unit = (config.unit as string) || this.defaultUnit;
			const timezone = (config.timezone as string) || this.defaultTimezone;

			// 获取当前时间
			const now = new Date();

			// 根据时区调整时间
			const adjustedTime = this.adjustToTimezone(now, timezone);

			// 根据单位生成时间戳
			let timestamp: number;
			switch (unit) {
				case 's':
					// 秒级时间戳
					timestamp = Math.floor(adjustedTime.getTime() / 1000);
					break;
				case 'ms':
				default:
					// 毫秒级时间戳（默认）
					timestamp = adjustedTime.getTime();
					break;
			}

			return timestamp.toString();
		} catch (error) {
			throw new Error(`时间戳生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private adjustToTimezone(date: Date, timezone: string): Date {
		try {
			// 创建一个新日期对象以避免修改原始日期
			const adjustedDate = new Date(date);

			// 使用 Intl API 处理时区转换
			if (timezone === 'UTC') {
				return adjustedDate; // UTC 时间不需要转换
			}

			// 获取目标时区的当前时间
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric',
				hour12: false
			});

			// 格式化日期以获取时区调整后的时间
			const parts = formatter.formatToParts(adjustedDate);
			
			// 提取各个时间组件
			const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
			const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
			const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
			const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
			const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
			const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

			// 创建新的日期对象
			return new Date(year, month, day, hour, minute, second);
		} catch (error) {
			console.error('时区转换失败:', error);
			return date; // 如果转换失败，返回原始日期
		}
	}

	getConfigUI(): string {
		// 返回配置 UI 的 HTML
		return `
			<div class="timestamp-generate-config">
				<div class="config-item">
					<label>单位:</label>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="timestamp-unit" value="ms" ${this.defaultUnit === 'ms' ? 'checked' : ''}>
							<span>毫秒(ms)</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="timestamp-unit" value="s" ${this.defaultUnit === 's' ? 'checked' : ''}>
							<span>秒(s)</span>
						</label>
					</div>
				</div>
				
				<div class="config-item">
					<label>时区:</label>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="timestamp-timezone" value="Asia/Shanghai" ${this.defaultTimezone === 'Asia/Shanghai' ? 'checked' : ''}>
							<span>北京时间</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="timestamp-timezone" value="UTC" ${this.defaultTimezone === 'UTC' ? 'checked' : ''}>
							<span>UTC 时间</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="timestamp-timezone" value="America/New_York" ${this.defaultTimezone === 'America/New_York' ? 'checked' : ''}>
							<span>纽约时间</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="timestamp-timezone" value="Europe/London" ${this.defaultTimezone === 'Europe/London' ? 'checked' : ''}>
							<span>伦敦时间</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="timestamp-timezone" value="Asia/Tokyo" ${this.defaultTimezone === 'Asia/Tokyo' ? 'checked' : ''}>
							<span>东京时间</span>
						</label>
					</div>
				</div>
			</div>
		`;
	}

	extractConfigFromUI(container: HTMLElement): Record<string, unknown> {
		// 从 UI 容器中提取配置
		const unitInputs = container.querySelectorAll('input[name="timestamp-unit"]');
		const timezoneInputs = container.querySelectorAll('input[name="timestamp-timezone"]');

		let unit = this.defaultUnit;
		unitInputs.forEach(input => {
			if ((input as HTMLInputElement).checked) {
				unit = (input as HTMLInputElement).value;
			}
		});

		let timezone = this.defaultTimezone;
		timezoneInputs.forEach(input => {
			if ((input as HTMLInputElement).checked) {
				timezone = (input as HTMLInputElement).value;
			}
		});

		return { unit, timezone };
	}
}