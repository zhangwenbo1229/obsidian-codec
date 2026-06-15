// src/chain-state/operation-runtime-state.ts

/**
 * 操作的运行时状态
 * 这些状态只在当前会话中有效，不会保存到操作链数据中
 */
export interface OperationRuntimeState {
    /** 操作是否被禁用 */
    disabled: boolean;
    /** 操作是否设置了断点 */
    breakpoint: boolean;
    /** 断点是否已到达（用于断点之后的操作） */
    breakpointReached: boolean;
}

/**
 * 操作状态枚举
 */
export enum OperationState {
    /** 正常状态 */
    Normal = 'normal',
    /** 禁用状态 */
    Disabled = 'disabled',
    /** 断点状态 */
    Breakpoint = 'breakpoint'
}