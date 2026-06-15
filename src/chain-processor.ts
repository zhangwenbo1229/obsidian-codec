import type { OperationRegistry } from './operation-registry';
import type { Operation } from './operations/interfaces';
import { OperationCategory, OperationConfig, ChainResult, ChainStepResult, ValidationResult } from './types';
import { OperationRuntimeState } from './chain-state';

export interface ChainProcessorOptions {
	onProgress?: (current: number, total: number) => void;
	onStepComplete?: (step: number, result: ChainStepResult) => void;
	onBreakpoint?: (operationIndex: number) => void;
	getRuntimeState?: (operationIndex: number) => OperationRuntimeState | undefined;
}

export class ChainProcessor {
	private registry: OperationRegistry;

	constructor(registry: OperationRegistry) {
		this.registry = registry;
	}

	async executeChain(
		input: string,
		chain: OperationConfig[],
		options: ChainProcessorOptions = {}
	): Promise<ChainResult> {
		const steps: ChainStepResult[] = [];
		let currentData = input;
		
		try {
			// 验证操作链
			const validation = this.validateChain(chain);
			if (!validation.valid) {
				return {
					success: false,
					data: '',
					error: validation.error || '操作链验证失败',
					steps: []
				};
			}

			// 执行操作链
			for (let i = 0; i < chain.length; i++) {
				const operationConfig = chain[i];
				if (!operationConfig) continue;
				
				const operation = this.registry.get(operationConfig.operationId);
				
				if (!operation) {
					throw new Error(`未找到操作: ${operationConfig.operationId}`);
				}

				// 检查运行时状态
				const runtimeState = options.getRuntimeState?.(i);
				
				// 跳过禁用的操作
				if (runtimeState?.disabled) {
					const stepResult: ChainStepResult = {
						step: i + 1,
						operationId: operationConfig.operationId,
						success: true,
						data: currentData,
						skipped: true
					};
					
					steps.push(stepResult);
					options.onStepComplete?.(i + 1, stepResult);
					options.onProgress?.(i + 1, chain.length);
					continue;
				}

				// 检查断点
				if (runtimeState?.breakpoint && options.onBreakpoint) {
					// 先执行当前操作
					const result = await operation.execute(currentData, operationConfig.config);
					
					const stepResult: ChainStepResult = {
						step: i + 1,
						operationId: operationConfig.operationId,
						success: result.success,
						data: result.data,
						error: result.error
					};
					
					steps.push(stepResult);
					currentData = result.data;
					
					// 触发断点回调并停止执行
					options.onBreakpoint?.(i);
					options.onStepComplete?.(i + 1, stepResult);
					
					return {
						success: true,
						data: currentData,
						steps,
						breakpoint: true
					};
				}

				// 报告进度
				options.onProgress?.(i + 1, chain.length);

				// 执行操作
				const result = await operation.execute(currentData, operationConfig.config);
				
				const stepResult: ChainStepResult = {
					step: i + 1,
					operationId: operationConfig.operationId,
					success: result.success,
					data: result.data,
					error: result.error
				};
				
				steps.push(stepResult);
				options.onStepComplete?.(i + 1, stepResult);

				if (!result.success) {
					return {
						success: false,
						data: currentData,
						error: result.error || '操作执行失败',
						steps
					};
				}

				currentData = result.data;
			}

			return {
				success: true,
				data: currentData,
				steps
			};
		} catch (error) {
			return {
				success: false,
				data: currentData,
				error: error instanceof Error ? error.message : '未知错误',
				steps
			};
		}
	}

	validateChain(chain: OperationConfig[]): import('./types').ValidationResult {
		const errors: string[] = [];

		for (const config of chain) {
			const operation = this.registry.get(config.operationId);
			if (!operation) {
				errors.push(`未找到操作: ${config.operationId}`);
			}
		}

		if (errors.length > 0) {
			return {
				valid: false,
				error: errors.join('; ')
			};
		}

		return { valid: true };
	}
}