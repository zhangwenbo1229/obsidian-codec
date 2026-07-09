import { FileData } from './types';

export class FileManager {
	private static instance: FileManager;
	private fileStorage: Map<string, FileData> = new Map();
	private blobUrlStorage: Map<string, string> = new Map();
	private counter: number = 0;

	private constructor() {}

	static getInstance(): FileManager {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager();
		}
		return FileManager.instance;
	}

	// 存储文件数据
	storeFile(fileData: FileData): string {
		const fileId = `file_${Date.now()}_${this.counter++}`;
		this.fileStorage.set(fileId, fileData);
		
		// 创建并存储Blob URL
		const blobUrl = this.createBlobUrl(fileData);
		this.blobUrlStorage.set(fileId, blobUrl);
		
		return fileId;
	}

	// 获取文件数据
	getFile(fileId: string): FileData | null {
		return this.fileStorage.get(fileId) || null;
	}

	// 创建Blob URL
	createBlobUrl(fileData: FileData): string {
		if (typeof fileData.data === 'string') {
			// 文本数据
			const blob = new Blob([fileData.data], { type: fileData.mimeType || 'text/plain' });
			return URL.createObjectURL(blob);
		} else if (fileData.data instanceof ArrayBuffer) {
			// 二进制数据
			const blob = new Blob([fileData.data], { type: fileData.mimeType || 'application/octet-stream' });
			return URL.createObjectURL(blob);
		}
		throw new Error('不支持的文件数据格式');
	}

	// 获取文件的Blob URL
	getBlobUrl(fileId: string): string | null {
		return this.blobUrlStorage.get(fileId) || null;
	}

	// 清理文件数据
	removeFile(fileId: string): void {
		const blobUrl = this.blobUrlStorage.get(fileId);
		if (blobUrl) {
			// 清理Blob URL
			URL.revokeObjectURL(blobUrl);
		}
		
		this.blobUrlStorage.delete(fileId);
		this.fileStorage.delete(fileId);
	}

	// 获取所有文件信息
	getAllFiles(): Map<string, FileData> {
		return new Map(this.fileStorage);
	}

	// 清理所有文件
	clearAll(): void {
		this.blobUrlStorage.forEach((blobUrl, fileId) => {
			// 清理所有Blob URL
			URL.revokeObjectURL(blobUrl);
		});
		
		this.blobUrlStorage.clear();
		this.fileStorage.clear();
		this.counter = 0;
	}

	// 通过Blob URL查找文件
	findFileByBlobUrl(blobUrl: string): { fileId: string; fileData: FileData } | null {
		for (const [fileId, storedBlobUrl] of this.blobUrlStorage) {
			if (storedBlobUrl === blobUrl) {
				const fileData = this.fileStorage.get(fileId);
				if (fileData) {
					return { fileId, fileData };
				}
			}
		}
		return null;
	}
}