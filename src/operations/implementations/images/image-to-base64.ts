import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ImageToBase64Operation extends BaseOperation {
	id = 'image-to-base64';
	name = '图片转Base64';
	category = OperationCategory.ENCODING;
	description = '将图片转换为Base64格式，支持常见图片格式';
	
	supportsFileData: boolean = true;  // 标识支持文件数据

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入图片Base64数据或使用图片选择器' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string | any, config: Record<string, unknown>): Promise<string> {
		try {
			console.log('图片转Base64开始，输入类型:', typeof input);
			
			const format = (config.format as string) || 'data-url';

			// 处理文件数据
			if (typeof input === 'object' && input !== null && 'isFile' in input) {
				const fileData = input as any;
				console.log('识别到文件数据:', fileData.name, '数据类型:', typeof fileData.data);
				
				// 将ArrayBuffer转换为Base64
				if (fileData.data instanceof ArrayBuffer) {
					const bytes = new Uint8Array(fileData.data);
					const base64 = this.arrayBufferToBase64(bytes);
					console.log('Base64转换完成，长度:', base64.length);
					return this.formatBase64Output(base64, format);
				} else {
					console.error('不支持的文件数据类型:', typeof fileData.data);
					throw new Error('文件数据格式不支持，需要ArrayBuffer格式');
				}
			}

			// 处理Data URL字符串输入
			if (typeof input === 'string' && input.startsWith('data:image/')) {
				const parts = input.split(',');
				if (parts.length >= 2) {
					const base64Part = parts[1];
					return this.formatBase64Output(base64Part, format);
				}
			}

			// 验证纯Base64数据
			if (typeof input === 'string') {
				this.validateImageBase64(input);
				return this.formatBase64Output(input, format);
			}
			
			throw new Error('不支持的输入格式，请选择图片文件或输入Base64数据');
		} catch (error) {
			console.error('图片转Base64错误:', error);
			throw new Error(`图片Base64转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	private formatBase64Output(base64: string, format: string): string {
		const mimeType = this.detectMimeType(base64);

		switch (format) {
			case 'data-url':
				return `data:${mimeType};base64,${base64}`;
			case 'base64-only':
				return base64;
			case 'html-img':
				return `<img src="data:${mimeType};base64,${base64}" alt="Base64图片" />`;
			default:
				return base64;
		}
	}

	private validateImageBase64(base64: string): void {
		if (!base64 || base64.length === 0) {
			throw new Error('Base64数据为空');
		}
		
		// 基本的Base64字符验证
		const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
		if (!base64Regex.test(base64.replace(/\s/g, ''))) {
			throw new Error('输入包含无效的Base64字符');
		}
	}

	private async convertImageFile(filePath: string, format: string, includeMime: boolean): Promise<string> {
		// 实际实现需要通过文件选择器获取图片数据
		// 这里提供接口定义
		throw new Error('图片转换需要通过文件选择器实现');
	}

	private formatBase64Output(base64: string, format: string, includeMime: boolean): string {
		const mimeType = this.detectMimeType(base64);

		switch (format) {
			case 'data-url':
				return includeMime ? `data:${mimeType};base64,${base64}` : base64;
			case 'base64-only':
				return base64;
			case 'html-img':
				return `<img src="data:${mimeType};base64,${base64}" alt="Base64图片" />`;
			default:
				return base64;
		}
	}

	private detectMimeType(base64: string): string {
		// 根据Base64数据头检测图片类型
		if (base64.startsWith('/9j/')) return 'image/jpeg';
		if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
		if (base64.startsWith('R0lGOD')) return 'image/gif';
		if (base64.startsWith('Qk0')) return 'image/bmp';
		if (base64.startsWith('UklGR')) return 'image/webp';
		return 'image/png'; // 默认
	}
}