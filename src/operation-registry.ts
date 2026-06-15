import { Operation, OperationCategory } from './operations/interfaces';
import type { OperationRegistry } from './operations/interfaces';
import { ValidationResult } from './types';

export class InMemoryOperationRegistry implements OperationRegistry {
	private operations = new Map<string, Operation>();

	register(operation: Operation): void {
		if (this.operations.has(operation.id)) {
			throw new Error(`Operation with id "${operation.id}" already registered`);
		}
		this.operations.set(operation.id, operation);
	}

	unregister(operationId: string): void {
		if (!this.operations.delete(operationId)) {
			throw new Error(`Operation with id "${operationId}" not found`);
		}
	}

	get(operationId: string): Operation | undefined {
		return this.operations.get(operationId);
	}

	getByCategory(category: OperationCategory): Operation[] {
		return Array.from(this.operations.values()).filter(
			operation => operation.category === category
		);
	}

	search(query: string): Operation[] {
		const lowerQuery = query.toLowerCase();
		return Array.from(this.operations.values()).filter(
			operation => 
				operation.name.toLowerCase().includes(lowerQuery) ||
				operation.description.toLowerCase().includes(lowerQuery) ||
				operation.id.toLowerCase().includes(lowerQuery)
		);
	}

	listAll(): Operation[] {
		return Array.from(this.operations.values());
	}
	
	clear(): void {
		this.operations.clear();
	}
}

export const globalRegistry = new InMemoryOperationRegistry();