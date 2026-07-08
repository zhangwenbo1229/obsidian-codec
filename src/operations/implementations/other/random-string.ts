import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class RandomStringOperation extends BaseOperation {
	id = 'random-string';
	name = '随机字符串生成';
	category = OperationCategory.OTHER;
	description = '生成指定长度和数量的随机字符串，每行一个';

	// 默认配置
	private defaultMinLength = 8;
	private defaultMaxLength = 16;
	private defaultCharset = '';
	private defaultCount = 10;

	// 预定义字符集
	private predefinedCharsets = {
		digits: '0123456789',
		lowercase: 'abcdefghijklmnopqrstuvwxyz',
		uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		symbols: '~!@#$%^&*()_+'
	};

	protected validateInput(input: string): import('../../../types').ValidationResult {
		// 随机字符串生成不依赖输入，总是有效
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			// 获取配置参数
			const minLength = (config.minLength as number) || this.defaultMinLength;
			const maxLength = (config.maxLength as number) || this.defaultMaxLength;
			let charset = (config.charset as string) || this.defaultCharset;
			const count = (config.count as number) || this.defaultCount;

			// 验证参数
			if (minLength < 1 || maxLength < minLength) {
				throw new Error('无效的长度范围');
			}
			if (count < 1 || count > 1000) {
				throw new Error('生成数量必须在1-1000之间');
			}
			if (charset.length === 0) {
				throw new Error('字符集不能为空');
			}

			// 生成随机字符串
			const strings: string[] = [];
			for (let i = 0; i < count; i++) {
				// 随机生成长度（在minLength和maxLength之间）
				const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
				strings.push(this.generateRandomString(length, charset));
			}

			// 按行输出
			return strings.join('\n');
		} catch (error) {
			throw new Error(`随机字符串生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private generateRandomString(length: number, charset: string): string {
		const result: string[] = [];
		const charsetLength = charset.length;
		
		for (let i = 0; i < length; i++) {
			// 使用加密安全的随机数生成器
			let randomIndex: number;
			if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
				const randomBytes = new Uint8Array(1);
				crypto.getRandomValues(randomBytes);
				randomIndex = randomBytes[0] % charsetLength;
			} else {
				// 回退到Math.random
				randomIndex = Math.floor(Math.random() * charsetLength);
			}
			result.push(charset[randomIndex]);
		}
		
		return result.join('');
	}

	getConfigUI(): string {
		// 返回配置 UI 的 HTML
		return `
			<div class="random-string-config">
				<div class="config-item">
					<label>长度范围:</label>
					<div class="length-inputs">
						<input type="number" class="min-length-input" value="${this.defaultMinLength}" min="1" max="1000" placeholder="最小长度">
						<span>-</span>
						<input type="number" class="max-length-input" value="${this.defaultMaxLength}" min="1" max="1000" placeholder="最大长度">
					</div>
				</div>
				
				<div class="config-item">
					<label>字符集:</label>
					<input type="text" class="charset-input" value="${this.defaultCharset}" placeholder="输入允许的字符集">
				</div>
				
				<div class="config-item">
					<label>快速选择:</label>
					<div class="checkbox-group">
						<label class="checkbox-option">
							<input type="checkbox" class="charset-checkbox" data-charset="${this.predefinedCharsets.digits}">
							<span>数字</span>
						</label>
						<label class="checkbox-option">
							<input type="checkbox" class="charset-checkbox" data-charset="${this.predefinedCharsets.lowercase}">
							<span>小写字母</span>
						</label>
						<label class="checkbox-option">
							<input type="checkbox" class="charset-checkbox" data-charset="${this.predefinedCharsets.uppercase}">
							<span>大写字母</span>
						</label>
						<label class="checkbox-option">
							<input type="checkbox" class="charset-checkbox" data-charset="${this.predefinedCharsets.symbols}">
							<span>常用符号</span>
						</label>
					</div>
				</div>
				
				<div class="config-item">
					<label>生成数量:</label>
					<input type="number" class="count-input" value="${this.defaultCount}" min="1" max="1000" placeholder="生成数量">
				</div>
			</div>
		`;
	}

	extractConfigFromUI(container: HTMLElement): Record<string, unknown> {
		// 从 UI 容器中提取配置
		const minLengthInput = container.querySelector('.min-length-input') as HTMLInputElement;
		const maxLengthInput = container.querySelector('.max-length-input') as HTMLInputElement;
		const charsetInput = container.querySelector('.charset-input') as HTMLInputElement;
		const countInput = container.querySelector('.count-input') as HTMLInputElement;

		const minLength = parseInt(minLengthInput?.value || `${this.defaultMinLength}`, 10);
		const maxLength = parseInt(maxLengthInput?.value || `${this.defaultMaxLength}`, 10);
		const charset = charsetInput?.value || this.defaultCharset;
		const count = parseInt(countInput?.value || `${this.defaultCount}`, 10);

		return { minLength, maxLength, charset, count };
	}

	// 获取预定义字符集数据（用于UI绑定）
	public getPredefinedCharsets(): Record<string, string> {
		return this.predefinedCharsets;
	}
}