import { Operation } from './interfaces';
import { OperationCategory, OperationResult, ValidationResult } from '../types';

export abstract class BaseOperation implements Operation {
	abstract id: string;
	abstract name: string;
	abstract category: OperationCategory;
	abstract description: string;

	protected abstract executeLogic(input: string, config: Record<string, unknown>): Promise<string>;

	protected abstract validateInput(input: string): ValidationResult;

	async execute(input: string, config: Record<string, unknown>): Promise<OperationResult> {
		try {
			const validation = this.validateInput(input);
			if (!validation.valid) {
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
		} catch (error) {
			return {
				success: false,
				data: '',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	validate(input: string): ValidationResult {
		return this.validateInput(input);
	}

	getConfigUI?(): string {
		return '';
	}
}