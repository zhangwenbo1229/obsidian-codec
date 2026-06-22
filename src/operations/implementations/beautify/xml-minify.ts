import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';

export class XmlMinifyOperation extends BaseOperation {
	id = 'xml-minify';
	name = 'xml压缩';
	category = OperationCategory.BEAUTIFY;
	description = '压缩 XML 输入并去除多余空白';

	protected validateInput(input: string): ValidationResult {
		if (!input || !input.trim()) {
			return { valid: false, error: '请输入要处理的内容' };
		}
		return { valid: true };
	}

	protected async executeLogic(input: string): Promise<string> {
		return input
			.replace(/>\s+</g, '><')
			.replace(/>\s+/g, '>')
			.replace(/\s+</g, '<')
			.trim();
	}
}
