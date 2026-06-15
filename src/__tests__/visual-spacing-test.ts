import { describe, it, expect, beforeEach } from 'vitest';

describe('背景卡片与执行按钮间距测试', () => {
	// 模拟实际的DOM���构
	function createTestContainer(): HTMLElement {
		const container = document.createElement('div');
		container.style.height = '100vh';
		container.style.overflow = 'hidden';
		container.style.position = 'relative';
		
		// 模拟背景卡片
		const chainContainer = document.createElement('div');
		chainContainer.setAttribute('data-chain-container', 'true');
		chainContainer.style.cssText = 'height: calc(100vh - 275px); overflow-y: auto; border: 2px dashed var(--background-modifier-border); border-radius: 8px; padding: 17px; background: var(--background-secondary);';
		
		// 模拟执行按钮容器
		const executionContainer = document.createElement('div');
		executionContainer.className = 'codec-execution-container';
		executionContainer.style.cssText = 'position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin: 12px 0; padding: 10px 12px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: var(--codec-shadow-sm); z-index: 10;';
		
		container.appendChild(chainContainer);
		container.appendChild(executionContainer);
		
		return container;
	}

	beforeEach(() => {
		// 设置CSS变量
		document.documentElement.style.setProperty('--background-secondary', '#f5f5f5');
		document.documentElement.style.setProperty('--background-modifier-border', '#ddd');
		document.documentElement.style.setProperty('--codec-shadow-sm', '0 1px 3px rgba(0,0,0,0.1)');
		document.documentElement.style.setProperty('--text-muted', '#999');
	});

	it('两个容器之间应该有视觉间隙', () => {
		const container = createTestContainer();
		document.body.appendChild(container);
		
		// 获取两个元素
		const chainContainer = container.querySelector('[data-chain-container="true"]') as HTMLElement;
		const executionContainer = container.querySelector('.codec-execution-container') as HTMLElement;
		
		// 验证元素存在
		expect(chainContainer).toBeTruthy();
		expect(executionContainer).toBeTruthy();
		
		// 获取位置信息
		const chainBottom = chainContainer.getBoundingClientRect().bottom;
		const executionTop = executionContainer.getBoundingClientRect().top;
		
		// 验证两个元素不重叠
		expect(executionTop).toBeGreaterThan(chainBottom);
		
		// 验证至少有12px间距
		const gap = executionTop - chainBottom;
		expect(gap).toBeGreaterThanOrEqual(12);
		
		// 清理
		document.body.removeChild(container);
	});

	it('背景卡片应该有正确的高度计算', () => {
		const container = createTestContainer();
		document.body.appendChild(container);
		
		const chainContainer = container.querySelector('[data-chain-container="true"]') as HTMLElement;
		const computedStyle = window.getComputedStyle(chainContainer);
		
		// 验证高度计算公式
		expect(computedStyle.height).toContain('calc');
		expect(computedStyle.height).toContain('100vh');
		expect(computedStyle.height).toContain('275');
		
		// 验证overflow设置
		expect(computedStyle.overflowY).toBe('auto');
		
		document.body.removeChild(container);
	});

	it('执行按钮容器应该保持sticky定位', () => {
		const container = createTestContainer();
		document.body.appendChild(container);
		
		const executionContainer = container.querySelector('.codec-execution-container') as HTMLElement;
		const computedStyle = window.getComputedStyle(executionContainer);
		
		// 验证sticky定位
		expect(computedStyle.position).toBe('sticky');
		expect(computedStyle.bottom).toBe('0px');
		
		// 验证margin设置
		expect(computedStyle.marginTop).toBe('12px');
		expect(computedStyle.marginBottom).toBe('12px');
		
		document.body.removeChild(container);
	});

	it('整体布局应该协调', () => {
		const container = createTestContainer();
		document.body.appendChild(container);
		
		const chainContainer = container.querySelector('[data-chain-container="true"]') as HTMLElement;
		const executionContainer = container.querySelector('.codec-execution-container') as HTMLElement;
		
		// 获取容器总高度
		const containerHeight = container.getBoundingClientRect().height;
		
		// 获取两个元素的高度
		const chainHeight = chainContainer.getBoundingClientRect().height;
		const executionHeight = executionContainer.getBoundingClientRect().height;
		
		// 验证总高度不超过容器高度
		const totalHeight = chainHeight + executionHeight;
		expect(totalHeight).toBeLessThanOrEqual(containerHeight + 50); // 允许一些误差
		
		document.body.removeChild(container);
	});
});