// src/chain-state/chain-state-manager.ts

import { OperationChainItemController } from './operation-chain-item-controller';
import { OperationRuntimeState } from './operation-runtime-state';

/**
 * 操作链状态管理器
 * 负责协调所有操作链项的状态和断点效果更新
 */
export class ChainStateManager {
    private controllers: Map<string, OperationChainItemController> = new Map();
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    /**
     * 注册操作链项控制器
     */
    registerItem(operationId: string, controller: OperationChainItemController): void {
        this.controllers.set(operationId, controller);
    }

    /**
     * 获取操作链项控制器
     */
    getController(operationId: string): OperationChainItemController | undefined {
        return this.controllers.get(operationId);
    }

    /**
     * 获取操作运行时状态
     */
    getItemState(operationId: string): OperationRuntimeState | undefined {
        const controller = this.controllers.get(operationId);
        return controller ? controller.getState() : undefined;
    }

    /**
     * 更新断点效果
     * 在断点之后的操作设置断点已到达状态
     */
    updateBreakpointEffects(): void {
        let breakpointReached = false;
        
        // 按顺序遍历所有操作链项
        const chainItems = this.container.querySelectorAll('.codec-chain-item');
        chainItems.forEach((item) => {
            const operationId = item.getAttribute('data-chain-operation-id');
            if (!operationId) return;
            
            const controller = this.controllers.get(operationId);
            if (!controller) return;
            
            const state = controller.getState();
            
            // 如果当前操作有断点
            if (state.breakpoint) {
                breakpointReached = true;
            }
            
            // 设置断点已到达状态
            controller.setBreakpointReached(breakpointReached);
        });
    }

    /**
     * 重置所有状态
     */
    resetAll(): void {
        this.controllers.forEach((controller) => {
            controller.reset();
        });
    }

    /**
     * 获取所有控制器
     */
    getAllControllers(): OperationChainItemController[] {
        return Array.from(this.controllers.values());
    }
}