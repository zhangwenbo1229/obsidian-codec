import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class Base64ToImageOperation extends BaseOperation {
	id = 'base64-to-image';
	name = 'Base64转图片';
	category = OperationCategory.DECODING;
	description = '将Base64格式数据转换回图片，支持保存为文件';

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请输入Base64编码的图片数据' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
		try {
			const outputFormat = (config.outputFormat as string) || 'preview';
			const autoSave = (config.autoSave as boolean) === true;

			// 清理输入数据
			const cleanedInput = this.cleanBase64Input(input);
			
			// 验证Base64图片数据
			this.validateImageBase64(cleanedInput);

			switch (outputFormat) {
				case 'preview':
					return this.generateImagePreview(cleanedInput);
				case 'file':
					return await this.saveAsImageFile(cleanedInput, config);
				case 'data-url':
					return this.generateDataURL(cleanedInput);
				default:
					return cleanedInput;
			}
		} catch (error) {
			throw new Error(`Base64转图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private cleanBase64Input(input: string): string {
		// 移除可能的data URL前缀
		let cleaned = input.replace(/^data:image\/[a-z]+;base64,/i, '');
		// 移除空白字符
		cleaned = cleaned.replace(/\s/g, '');
		return cleaned;
	}

	private validateImageBase64(base64: string): void {
		const validSignatures = {
			'image/jpeg': '/9j/',
			'image/png': 'iVBORw0KGgo',
			'image/gif': 'R0lGOD',
			'image/bmp': 'Qk0',
			'image/webp': 'UklGR'
		};

		const isValid = Object.values(validSignatures).some(sig => base64.startsWith(sig));
		if (!isValid) {
			throw new Error('输入的Base64数据不是有效的图片格式');
		}
	}

	private generateImagePreview(base64: string): string {
		const mimeType = this.detectMimeType(base64);
		return `[图片预览: ${mimeType}]\nBase64长度: ${base64.length} 字符\n预览:\n<img src="data:${mimeType};base64,${base64}" style="max-width:100%" />`;
	}

	private async saveAsImageFile(base64: string, config: Record<string, unknown>): Promise<string> {
		const mimeType = this.detectMimeType(base64);
		const extension = this.getMimeExtension(mimeType);
		
		// 转换Base64为二进制数据
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// 创建文件并下载
		const blob = new Blob([bytes], { type: mimeType });
		const url = URL.createObjectURL(blob);
		
		const a = document.createElement('a');
		a.href = url;
		a.download = `image.${extension}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		return `已保存为 image.${extension}`;
	}

	private detectMimeType(base64: string): string {
		if (base64.startsWith('/9j/')) return 'image/jpeg';
		if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
		if (base64.startsWith('R0lGOD')) return 'image/gif';
		if (base64.startsWith('Qk0')) return 'image/bmp';
		if (base64.startsWith('UklGR')) return 'image/webp';
		return 'image/png';
	}

	private getMimeExtension(mimeType: string): string {
		const extensions: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/bmp': 'bmp',
			'image/webp': 'webp'
		};
		return extensions[mimeType] || 'png';
	}

	private generateDataURL(base64: string): string {
		const mimeType = this.detectMimeType(base64);
		return `data:${mimeType};base64,${base64}`;
	}
}