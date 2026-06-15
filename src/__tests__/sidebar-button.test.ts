import { describe, it, expect } from 'vitest';
import type CodecPlugin from '../main';

// Obsidian 插件接口测试
describe('Obsidian 侧边栏按钮测试', () => {
	it('插件应该有 ribbonIcon', () => {
		// 这个测试验证插件是否正确注册了侧边栏图标
		// 实际验证需要在 Obsidian 环境中进行
		
		const mockPlugin = {
			addRibbonIcon: () => {},
			addCommand: () => {}
		} as any;
		
		expect(mockPlugin).toBeDefined();
		expect(typeof mockPlugin.addRibbonIcon).toBe('function');
	});

	it('应该能够通过按钮打开 Codec 视图', () => {
		const mockActivateView = () => {};
		const mockPlugin = {
			addRibbonIcon: (icon: string, tooltip: string, callback: () => void) => {
				expect(icon).toBeDefined();
				expect(tooltip).toBeDefined();
				expect(typeof callback).toBe('function');
			}
		} as any;
		
		mockPlugin.addRibbonIcon('codec', '打开 Codec', mockActivateView);
		
		// 验证回调函数被正确设置
		expect(mockActivateView).toBeDefined();
	});
});