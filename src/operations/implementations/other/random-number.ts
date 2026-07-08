import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class RandomNumberOperation extends BaseOperation {
	id = 'random-number';
	name = '随机密钥生成';
	category = OperationCategory.OTHER;
	description = '生成指定长度和格式的随机密钥';

	// 默认配置
	private defaultLength = 16;
	private defaultUnit = 'byte';
	private defaultFormat = 'hex';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		// 随机数生成不依赖输入，总是有效
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			// 获取配置参数
			const length = (config.length as number) || this.defaultLength;
			const unit = (config.unit as string) || this.defaultUnit;
			const format = (config.format as string) || this.defaultFormat;

			// 根据单位计算实际需要的字节数
			let byteLength: number;
			switch (unit) {
				case 'bit':
					byteLength = Math.ceil(length / 8);
					break;
				case 'char':
					// 字符数，根据输出格式计算需要的字节数
					if (format === 'hex') {
						byteLength = Math.ceil(length / 2); // HEX 每字节 2 个字符
					} else if (format === 'base64') {
						byteLength = Math.ceil(length * 3 / 4); // Base64 编码后约为原长度的 4/3
					} else {
						byteLength = length; // RAW 格式
					}
					break;
				case 'byte':
				default:
					byteLength = length;
					break;
			}

			// 生成随机字节
			const randomBytes = this.generateRandomBytes(byteLength);

			// 根据输出格式转换
			switch (format) {
				case 'hex':
					return this.bytesToHex(randomBytes);
				case 'base64':
					return this.bytesToBase64(randomBytes);
				case 'raw':
					return this.bytesToRaw(randomBytes);
				default:
					return this.bytesToHex(randomBytes);
			}
		} catch (error) {
			throw new Error(`随机数生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private generateRandomBytes(length: number): Uint8Array {
		// 使用 Web Crypto API 生成安全的随机数
		const randomBytes = new Uint8Array(length);
		
		// 使用 crypto.getRandomValues 生成随机数
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			crypto.getRandomValues(randomBytes);
		} else {
			// 回退到 Math.random（不安全，但保证兼容性）
			for (let i = 0; i < length; i++) {
				randomBytes[i] = Math.floor(Math.random() * 256);
			}
		}
		
		return randomBytes;
	}

	private bytesToHex(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	private bytesToBase64(bytes: Uint8Array): string {
		const binaryString = Array.from(bytes)
			.map(byte => String.fromCharCode(byte))
			.join('');
		return btoa(binaryString);
	}

	private bytesToRaw(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map(byte => String.fromCharCode(byte))
			.join('');
	}

	getConfigUI(): string {
		// 返回配置 UI 的 HTML
		return `
			<div class="random-number-config">
				<div class="config-item">
					<label>随机数长度:</label>
					<input type="number" 
						   class="random-length-input" 
						   value="${this.defaultLength}" 
						   min="1" 
						   max="10000" 
						   placeholder="输入长度">
					<span class="config-hint">控制生成随机数的大小</span>
				</div>
				
				<div class="config-item">
					<label>单位:</label>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="random-unit" value="bit" ${this.defaultUnit === 'bit' ? 'checked' : ''}>
							<span>位</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="random-unit" value="char" ${this.defaultUnit === 'char' ? 'checked' : ''}>
							<span>字符</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="random-unit" value="byte" ${this.defaultUnit === 'byte' ? 'checked' : ''}>
							<span>字节</span>
						</label>
					</div>
				</div>
				
				<div class="config-item">
					<label>生成格式:</label>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="random-format" value="hex" ${this.defaultFormat === 'hex' ? 'checked' : ''}>
							<span>HEX</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="random-format" value="base64" ${this.defaultFormat === 'base64' ? 'checked' : ''}>
							<span>Base64</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="random-format" value="raw" ${this.defaultFormat === 'raw' ? 'checked' : ''}>
							<span>RAW</span>
						</label>
					</div>
				</div>
			</div>
		`;
	}

	extractConfigFromUI(container: HTMLElement): Record<string, unknown> {
		// 从 UI 容器中提取配置
		const lengthInput = container.querySelector('.random-length-input') as HTMLInputElement;
		const unitInputs = container.querySelectorAll('input[name="random-unit"]');
		const formatInputs = container.querySelectorAll('input[name="random-format"]');

		const length = parseInt(lengthInput?.value || `${this.defaultLength}`, 10);
		
		let unit = this.defaultUnit;
		unitInputs.forEach(input => {
			if ((input as HTMLInputElement).checked) {
				unit = (input as HTMLInputElement).value;
			}
		});

		let format = this.defaultFormat;
		formatInputs.forEach(input => {
			if ((input as HTMLInputElement).checked) {
				format = (input as HTMLInputElement).value;
			}
		});

		return { length, unit, format };
	}
}