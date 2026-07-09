import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ReadExifOperation extends BaseOperation {
	id = 'read-exif';
	name = '读取EXIF';
	category = OperationCategory.OTHER;
	description = '读取图片的EXIF信息，包括拍摄参数、GPS位置、设备信息等';
	
	supportsFileData: boolean = true;  // 标识支持文件数据

	protected validateInput(input: string): import('../../../types').ValidationResult {
		if (!input || input.trim().length === 0) {
			return { valid: false, error: '请选择图片文件或输入图片的Base64数据' };
		}
		
		// 如果是文件链接，跳过验证（由getFileData处理）
		if (input.includes('🆔 文件ID:') || input.includes('🔗 文件链接:')) {
			return { valid: true };
		}
		
		// 验证是否是图片数据
		if (typeof input === 'string' && !input.startsWith('data:image/') && !this.isBase64Image(input)) {
			return { valid: false, error: '输入必须是图片数据（Data URL或Base64格式）' };
		}
		
		return { valid: true };
	}

	protected async executeLogic(input: string | any, config: Record<string, unknown>): Promise<string> {
		try {
			console.log('EXIF读取开始，输入类型:', typeof input);
			
			const EXIF = await import('exif-js');
			
			// 处理文件数据
			if (typeof input === 'object' && input !== null && 'isFile' in input) {
				const fileData = input as any;
				console.log('识别到文件数据:', fileData.name, '数据类型:', typeof fileData.data);
				
				if (fileData.data instanceof ArrayBuffer) {
					console.log('开始从ArrayBuffer创建图片，ArrayBuffer大小:', fileData.data.byteLength, '字节');
					// 直接使用ArrayBuffer创建Image对象，避免Blob URL失效问题
					const image = await this.loadImageFromBuffer(fileData.data);
					console.log('图片加载完成，开始提取EXIF...');
					const exifData = await this.extractExifData(image, EXIF);
					console.log('EXIF提取完成，标签数量:', Object.keys(exifData).length);
					return this.formatExifAsMarkdown(exifData);
				} else {
					console.error('不支持的文件数据类型:', typeof fileData.data);
					throw new Error('文件数据格式不支持，需要ArrayBuffer格式');
				}
			}

			// 处理Base64字符串输入（兼容现有逻辑）
			if (typeof input === 'string') {
				const imageData = this.cleanInputData(input);
				const image = await this.loadImage(imageData);
				const exifData = await this.extractExifData(image, EXIF);
				return this.formatExifAsMarkdown(exifData);
			}

			throw new Error('不支持的输入格式，请选择图片文件');
		} catch (error) {
			console.error('EXIF读取错误:', error);
			throw new Error(`EXIF读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	private cleanInputData(input: string): string {
		// 移除Data URL前缀，获得纯Base64数据
		if (input.startsWith('data:image/')) {
			const parts = input.split(',');
			return parts[1];
		}
		return input;
	}

	private isBase64Image(data: string): boolean {
		// 检查是否是有效的图片Base64数据
		const imageSignatures = [
			'iVBORw0KGgo', // PNG
			'/9j/',         // JPEG
			'R0lGOD',      // GIF
			'Qk0',         // BMP
			'UklGR'        // WebP
		];
		return imageSignatures.some(sig => data.startsWith(sig));
	}

	private async loadImageFromBuffer(buffer: ArrayBuffer): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			try {
				console.log('loadImageFromBuffer开始，Buffer大小:', buffer.byteLength, '字节');
				
				// 直接将ArrayBuffer转换为Base64 Data URL，避免Blob URL失效问题
				const bytes = new Uint8Array(buffer);
				console.log('转换为Uint8Array完成，长度:', bytes.length);
				
				const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
				console.log('转换为二进制字符串完成，长度:', binary.length);
				
				const base64 = btoa(binary);
				console.log('Base64编码完成，长度:', base64.length);
				
				const dataUrl = `data:image/jpeg;base64,${base64}`;
				console.log('创建Data URL成功，总长度:', dataUrl.length);
				
				const image = new Image();
				image.onload = () => {
					console.log('图片从Data URL加载完成');
					resolve(image);
				};
				image.onerror = (error) => {
					console.error('图片从Data URL加载失败:', error);
					console.error('Data URL前缀:', dataUrl.substring(0, 100));
					reject(new Error('图片加载失败'));
				};
				image.src = dataUrl;
			} catch (error) {
				console.error('创建Data URL失败:', error);
				reject(error);
			}
		});
	}

	private async loadImage(base64Data: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('图片加载失败'));
			image.src = `data:image/jpeg;base64,${base64Data}`;
		});
	}

	private async extractExifData(image: HTMLImageElement, EXIF: any): Promise<any> {
		return new Promise((resolve, reject) => {
			EXIF.getData(image, function() {
				const allTags = EXIF.getAllTags(image);
				if (!allTags || Object.keys(allTags).length === 0) {
					// 图片没有EXIF信息是正常情况，不应该报错
					console.log('该图片不包含EXIF信息，这是正常情况');
					resolve({});
				} else {
					resolve(allTags);
				}
			});
		});
	}

	private formatExifAsMarkdown(exifData: any): string {
		// 如果没有EXIF数据，返回友好提示
		if (!exifData || Object.keys(exifData).length === 0) {
			return `# 📷 图片EXIF信息

该图片不包含EXIF信息。

**可能的原因：**
- 图片经过编辑软件处理，EXIF信息被移除
- 网络图片通常不包含EXIF信息
- 某些截图工具不会添加EXIF信息
- 图片格式不支持EXIF信息`;
		}
		
		let markdown = '# 📷 图片EXIF信息\n\n';
		
		// 基础拍摄信息
		const shootingInfo = this.extractShootingInfo(exifData);
		if (Object.keys(shootingInfo).length > 0) {
			markdown += '## 🎯 基础拍摄信息\n\n';
			markdown += '| 参数 | 值 |\n';
			markdown += '|------|-----|\n';
			for (const [key, value] of Object.entries(shootingInfo)) {
				markdown += `| ${key} | ${value} |\n`;
			}
			markdown += '\n';
		}
		
		// GPS位置信息
		const gpsInfo = this.extractGpsInfo(exifData);
		if (Object.keys(gpsInfo).length > 0) {
			markdown += '## 📍 GPS位置信息\n\n';
			markdown += '| 参数 | 值 |\n';
			markdown += '|------|-----|\n';
			for (const [key, value] of Object.entries(gpsInfo)) {
				markdown += `| ${key} | ${value} |\n`;
			}
			markdown += '\n';
		}
		
		// 设备和制造商信息
		const deviceInfo = this.extractDeviceInfo(exifData);
		if (Object.keys(deviceInfo).length > 0) {
			markdown += '## 📱 设备和制造商信息\n\n';
			markdown += '| 参数 | 值 |\n';
			markdown += '|------|-----|\n';
			for (const [key, value] of Object.entries(deviceInfo)) {
				markdown += `| ${key} | ${value} |\n`;
			}
			markdown += '\n';
		}
		
		// 图片技术规格
		const techSpecs = this.extractTechSpecs(exifData);
		if (Object.keys(techSpecs).length > 0) {
			markdown += '## 🔧 图片技术规格\n\n';
			markdown += '| 参数 | 值 |\n';
			markdown += '|------|-----|\n';
			for (const [key, value] of Object.entries(techSpecs)) {
				markdown += `| ${key} | ${value} |\n`;
			}
		}
		
		return markdown;
	}

	private extractShootingInfo(exifData: any): Record<string, string> {
		const info: Record<string, string> = {};
		
		if (exifData.DateTime) info['拍摄时间'] = exifData.DateTime;
		if (exifData.ExposureTime) info['快门速度'] = this.formatFraction(exifData.ExposureTime);
		if (exifData.FNumber) info['光圈'] = `f/${exifData.FNumber}`;
		if (exifData.ISO) info['ISO'] = exifData.ISO;
		if (exifData.FocalLength) info['焦距'] = `${exifData.FocalLength}mm`;
		if (exifData.Flash) info['闪光灯'] = exifData.Flash;
		if (exifData.WhiteBalance) info['白平衡'] = exifData.WhiteBalance;
		if (exifData.ExposureProgram) info['曝光程序'] = exifData.ExposureProgram;
		if (exifData.MeteringMode) info['测光模式'] = exifData.MeteringMode;
		
		return info;
	}

	private extractGpsInfo(exifData: any): Record<string, string> {
		const info: Record<string, string> = {};
		
		if (exifData.GPSLatitude && exifData.GPSLongitude) {
			info['纬度'] = this.formatDMS(exifData.GPSLatitude, exifData.GPSLatitudeRef);
			info['经度'] = this.formatDMS(exifData.GPSLongitude, exifData.GPSLongitudeRef);
			if (exifData.GPSAltitude) {
				info['海拔'] = `${exifData.GPSAltitude}米`;
			}
		}
		
		if (exifData.GPSDateStamp) {
			info['GPS日期'] = exifData.GPSDateStamp;
		}
		
		if (exifData.GPSTimeStamp) {
			info['GPS时间'] = exifData.GPSTimeStamp;
		}
		
		return info;
	}

	private extractDeviceInfo(exifData: any): Record<string, string> {
		const info: Record<string, string> = {};
		
		if (exifData.Make) info['制造商'] = exifData.Make;
		if (exifData.Model) info['相机型号'] = exifData.Model;
		if (exifData.LensModel) info['镜头型号'] = exifData.LensModel;
		if (exifData.Software) info['软件'] = exifData.Software;
		if (exifData.Orientation) info['方向'] = exifData.Orientation;
		
		return info;
	}

	private extractTechSpecs(exifData: any): Record<string, string> {
		const info: Record<string, string> = {};
		
		if (exifData.PixelXDimension && exifData.PixelYDimension) {
			info['图片尺寸'] = `${exifData.PixelXDimension} × ${exifData.PixelYDimension}`;
		}
		if (exifData.XResolution && exifData.YResolution) {
			info['分辨率'] = `${exifData.XResolution} × ${exifData.YResolution} DPI`;
		}
		if (exifData.ColorSpace) info['色彩空间'] = exifData.ColorSpace;
		if (exifData.Compression) info['压缩算法'] = exifData.Compression;
		if (exifData.Orientation) info['旋转方向'] = exifData.Orientation;
		
		return info;
	}

	private formatFraction(value: any): string {
		if (typeof value === 'number') {
			// 快于1/500秒格式
			if (value < 1) {
				const denominator = Math.round(1 / value);
				return `1/${denominator}秒`;
			}
			return `${value}秒`;
		}
		return value.toString();
	}

	private formatDMS(coordinates: number[], ref: string): string {
		if (!coordinates || coordinates.length < 3) return '未知';
		
		const degrees = coordinates[0];
		const minutes = coordinates[1];
		const seconds = coordinates[2];
		
		return `${degrees}°${minutes}'${seconds}" ${ref}`;
	}
}