// src/chain-state/operation-chain-item-controller.ts

import { OperationRuntimeState, OperationState } from './operation-runtime-state';
import { setIcon } from 'obsidian';

/**
 * 单个操作链项的控制器
 * 负责管理操作的状态、UI 更新和用户交互
 */
export class OperationChainItemController {
    private state: OperationRuntimeState;
    private element: HTMLElement;
    private disabledButton?: HTMLElement;
    private breakpointButton?: HTMLElement;

    constructor(element: HTMLElement) {
        this.element = element;
        this.state = this.getStateFromElement();
    }

    /**
     * 切换禁用状态
     */
    toggleDisabled(): void {
        this.state.disabled = !this.state.disabled;
        
        // 如果禁用了操作，同时清除断点状态
        if (this.state.disabled && this.state.breakpoint) {
            this.state.breakpoint = false;
        }
        
        this.updateElement();
        this.updateVisuals();
    }

    /**
     * 切换断点状态
     */
    toggleBreakpoint(): void {
        this.state.breakpoint = !this.state.breakpoint;
        
        // 如果设置了断点，确保操作不被禁用
        if (this.state.breakpoint && this.state.disabled) {
            this.state.disabled = false;
        }
        
        this.updateElement();
        this.updateVisuals();
    }

    /**
     * 更新 DOM 元素的状态属性
     */
    private updateElement(): void {
        const operationState = this.getOperationState();
        this.element.setAttribute('data-operation-state', operationState);
        
        if (this.state.breakpoint) {
            this.element.setAttribute('data-breakpoint-active', 'true');
        } else {
            this.element.removeAttribute('data-breakpoint-active');
        }
    }

    /**
     * 更新视觉效果
     */
    private updateVisuals(): void {
        const operationState = this.getOperationState();
        
        // 移除所有状态类
        this.element.removeClass('codec-operation-disabled', 'codec-operation-breakpoint', 'codec-operation-after-breakpoint');
        
        // 添加当前状态类
        switch (operationState) {
            case OperationState.Disabled:
                this.element.addClass('codec-operation-disabled');
                break;
            case OperationState.Breakpoint:
                this.element.addClass('codec-operation-breakpoint');
                break;
        }
        
        // 更新按钮状态
        this.updateButtons();
    }

    /**
     * 更新按钮视觉状态
     */
    private updateButtons(): void {
        if (this.disabledButton) {
            if (this.state.disabled) {
                this.disabledButton.addClass('active');
            } else {
                this.disabledButton.removeClass('active');
            }
        }
        
        if (this.breakpointButton) {
            if (this.state.breakpoint) {
                this.breakpointButton.addClass('active');
            } else {
                this.breakpointButton.removeClass('active');
            }
        }
    }

    /**
     * 设置按钮引用
     */
    setButtons(disabledButton: HTMLElement, breakpointButton: HTMLElement): void {
        this.disabledButton = disabledButton;
        this.breakpointButton = breakpointButton;
        this.updateButtons();
    }

    /**
     * 获取当前状态
     */
    getState(): OperationRuntimeState {
        return { ...this.state };
    }

    /**
     * 设置断点已到达状态
     */
    setBreakpointReached(reached: boolean): void {
        this.state.breakpointReached = reached;
        if (reached) {
            this.element.addClass('codec-operation-after-breakpoint');
        } else {
            this.element.removeClass('codec-operation-after-breakpoint');
        }
    }

    /**
     * 重置为正常状态
     */
    reset(): void {
        this.state = {
            disabled: false,
            breakpoint: false,
            breakpointReached: false
        };
        this.updateElement();
        this.updateVisuals();
    }

    /**
     * 从 DOM 元素读取状态
     */
    private getStateFromElement(): OperationRuntimeState {
        const operationState = this.element.getAttribute('data-operation-state');
        const breakpointActive = this.element.getAttribute('data-breakpoint-active') === 'true';
        
        return {
            disabled: operationState === OperationState.Disabled,
            breakpoint: operationState === OperationState.Breakpoint || breakpointActive,
            breakpointReached: this.element.hasClass('codec-operation-after-breakpoint')
        };
    }

    /**
     * 获取操作状态枚举值
     */
    private getOperationState(): OperationState {
        if (this.state.disabled) {
            return OperationState.Disabled;
        }
        if (this.state.breakpoint) {
            return OperationState.Breakpoint;
        }
        return OperationState.Normal;
    }
}