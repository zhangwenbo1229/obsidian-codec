import { OperationCategory, OperationResult, ValidationResult } from '../types';

export { OperationCategory };

export interface Operation {
	id: string;
	name: string;
	category: OperationCategory;
	description: string;
	
	execute(input: string, config: Record<string, unknown>): Promise<OperationResult>;
	validate(input: string): ValidationResult;
	
	getConfigUI?(): string;
}

export interface OperationRegistry {
	register(operation: Operation): void;
	unregister(operationId: string): void;
	get(operationId: string): Operation | undefined;
	getByCategory(category: OperationCategory): Operation[];
	search(query: string): Operation[];
	listAll(): Operation[];
}