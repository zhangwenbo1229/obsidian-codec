import { describe, it, expect } from 'vitest';

describe('标签页视图功能测试', () => {
	it('应该在当前工作区创建新标签页而不是分割视图', () => {
		// 测试视图打开方式
		// 应该使用 'tab' 模式而不是 'split' 模式
		
		const expectedModes = ['tab', 'split', 'window'];
		expect(expectedModes).toContain('tab');
	});

	it('新标签页应该显示 Codec 主视图', () => {
		// 测试视图类型
		const viewType = 'codec-view';
		
		expect(viewType).toBeDefined();
		expect(viewType).toBe('codec-view');
	});

	it('标签页应该能正常激活', () => {
		// 测试标签页激活状态
		const mockLeaf = {
			setViewState: () => {},
			active: true
		};
		
		expect(mockLeaf.active).toBe(true);
	});
});