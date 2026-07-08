import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ImageToBase64Operation extends BaseOperation {
	id = 'image-to-base64';
	name = '图片转Base64';
	category = OperationCategory.ENCODING;
	description = '将图片转换为Base64格式，支持常见图片格式';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入图片Base64数据或使用图片选择器' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const format = (config.format as string) || 'data-url';
			const includeMime = (config.includeMime as boolean) !== false;

			// 检查输入是否是文件引用
			if (input.startsWith('file://') || config.filePath) {
				return await this.convertImageFile(config.filePath as string, format, includeMime);
			}

			// 假设输入已经是Base64数据
			return this.formatBase64Output(input, format, includeMime);
		} catch (error) {
			throw new Error(`图片Base64转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
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