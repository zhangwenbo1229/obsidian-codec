import { describe, it, expect, beforeEach } from 'vitest';

describe('UI布局调整测试', () => {
	beforeEach(() => {
		// 设置CSS变量
		document.documentElement.style.setProperty('--background-secondary', '#f5f5f5');
		document.documentElement.style.setProperty('--background-modifier-border', '#ddd');
		document.documentElement.style.setProperty('--codec-shadow-sm', '0 1px 3px rgba(0,0,0,0.1)');
		document.documentElement.style.setProperty('--text-muted', '#999');
	});

	describe('背景卡片与执行按钮容器间距调整测试', () => {
		it('执行按钮容器的上边距应该为0px', () => {
			// 创建测试DOM结构
			const executionContainer = document.createElement('div');
			executionContainer.className = 'codec-execution-container';
			executionContainer.style.cssText = 'position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin: 16px 0 8px 0; padding: 10px 12px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: var(--codec-shadow-sm); z-index: 10;';
			
			document.body.appendChild(executionContainer);
			
			const computedStyle = window.getComputedStyle(executionContainer);
			
			// 这个测试会失败，因为当前实现的上边距是16px，不是0px
			expect(computedStyle.marginTop).toBe('0px');
			
			document.body.removeChild(executionContainer);
		});
	});

	describe('输入框和输出框高度调整测试', () => {
		it('输入框的最小高度应该为110px', () => {
			// 创建输入框测试DOM
			const inputArea = document.createElement('textarea');
			inputArea.className = 'codec-input-area';
			inputArea.style.cssText = 'width: 100%; flex: 1; min-height: 100px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace;';
			
			document.body.appendChild(inputArea);
			
			const computedStyle = window.getComputedStyle(inputArea);
			
			// 这个测试会失败，因为当前实现的最小高度是100px，不是110px
			expect(computedStyle.minHeight).toBe('110px');
			
			document.body.removeChild(inputArea);
		});

		it('输出框的最小高度应该为110px', () => {
			// 创建输出框测试DOM
			const outputArea = document.createElement('textarea');
			outputArea.className = 'codec-output-area';
			outputArea.style.cssText = 'width: 100%; flex: 1; min-height: 100px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace; readonly: true;';
			
			document.body.appendChild(outputArea);
			
			const computedStyle = window.getComputedStyle(outputArea);
			
			// 这个测试会失败，因为当前实现的最小高度是100px，不是110px
			expect(computedStyle.minHeight).toBe('110px');
			
			document.body.removeChild(outputArea);
		});
	});

	describe('布局协调性测试', () => {
		it('修改后的布局应该保持协调', () => {
			// 创建完整的测试DOM结构
			const container = document.createElement('div');
			container.style.height = '100vh';
			container.style.overflow = 'hidden';
			container.style.position = 'relative';
			
			// 添加输入框
			const inputArea = document.createElement('textarea');
			inputArea.className = 'codec-input-area';
			inputArea.style.cssText = 'width: 100%; flex: 1; min-height: 110px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace;';
			
			// 添加输出框
			const outputArea = document.createElement('textarea');
			outputArea.className = 'codec-output-area';
			outputArea.style.cssText = 'width: 100%; flex: 1; min-height: 110px; padding: 8px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: none; font-family: monospace; readonly: true;';
			
			// 添加执行按钮容器
			const executionContainer = document.createElement('div');
			executionContainer.className = 'codec-execution-container';
			executionContainer.style.cssText = 'position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin: 0 0 8px 0; padding: 10px 12px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: var(--codec-shadow-sm); z-index: 10;';
			
			container.appendChild(inputArea);
			container.appendChild(outputArea);
			container.appendChild(executionContainer);
			document.body.appendChild(container);
			
			// 验证元素存在
			expect(inputArea).toBeTruthy();
			expect(outputArea).toBeTruthy();
			expect(executionContainer).toBeTruthy();
			
			// 验证样式设置正确
			const inputStyle = window.getComputedStyle(inputArea);
			const outputStyle = window.getComputedStyle(outputArea);
			const executionStyle = window.getComputedStyle(executionContainer);
			
			expect(inputStyle.minHeight).toBe('110px');
			expect(outputStyle.minHeight).toBe('110px');
			expect(executionStyle.marginTop).toBe('0px');
			
			document.body.removeChild(container);
		});
	});
});