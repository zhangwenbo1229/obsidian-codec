import { Operation, OperationCategory, OperationResult, ValidationResult, FileData } from '../types';
import { FileManager } from '../file-manager';

export abstract class BaseOperation implements Operation {
	// ... 现有属性 ...
	
	// 新增：标识是否支持文件数据
	supportsFileData: boolean = false;

	protected abstract executeLogic(input: string, config: Record<string, unknown>): Promise<string>;

	protected abstract validateInput(input: string): ValidationResult;

	async execute(input: string, config: Record<string, unknown>): Promise<OperationResult> {
		try {
			// 尝试获取文件数据
			const fileData = this.getFileData(input);
			
			if (fileData && this.supportsFileData) {
				// 支持文件数据的操作，处理文件对象
				console.log(`操作 ${this.id} 识别到文件数据，跳过文本验证`);
				const result = await this.executeLogic(fileData as any, config);
				return {
					success: true,
					data: result,
					fileData: fileData
				};
			} else {
				// 普通文本处理
				console.log(`操作 ${this.id} 进行文本处理，输入长度:`, input.length);
				const validation = this.validateInput(input);
				if (!validation.valid) {
					console.log(`操作 ${this.id} 文本验证失败:`, validation.error);
					return {
						success: false,
						data: '',
						error: validation.error || 'Validation failed'
					};
				}
				const result = await this.executeLogic(input, config);
				return {
					success: true,
					data: result
				};
			}
		} catch (error) {
			console.error(`操作 ${this.id} 执行出错:`, error);
			return {
				success: false,
				data: '',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	// 新增：文件访问接口
	protected getFileData(input: string): FileData | null {
		const fileManager = FileManager.getInstance();
		
		// 1. 首先检查文件ID（最可靠的方式）
		const fileIdMatch = input.match(/🆔 文件ID:\s*(file_\d+_\d+)/);
		if (fileIdMatch) {
			const fileData = fileManager.getFile(fileIdMatch[1]);
			if (fileData) {
				console.log('通过文件ID找到文件:', fileIdMatch[1]);
				return fileData;
			}
		}
		
		// 2. 检查Blob URL（备用方式）
		const blobUrlMatch = input.match(/🔗 文件链接:\s*(blob:[^\s\n]+)/);
		if (blobUrlMatch) {
			const blobUrl = blobUrlMatch[1];
			const found = fileManager.findFileByBlobUrl(blobUrl);
			if (found) {
				console.log('通过Blob URL找到文件:', found.fileId);
				return found.fileData;
			}
		}
		
		// 3. 宽松匹配（兼容性考虑）
		if (input.includes('blob:')) {
			for (const [fileId, fileData] of fileManager.getAllFiles()) {
				const storedBlobUrl = fileManager.getBlobUrl(fileId);
				if (storedBlobUrl && input.includes(storedBlobUrl)) {
					console.log('通过模糊匹配找到文件:', fileId);
					return fileData;
				}
			}
		}
		
		console.log('未能识别文件链接，输入:', input.substring(0, 100));
		return null;
	}

	// 保留原有的extractFileData方法用于兼容
	protected extractFileData(input: string): FileData | null {
		return this.getFileData(input);
	}

	validate(input: string): ValidationResult {
		return this.validateInput(input);
	}

	getConfigUI?(): string {
		return '';
	}
}