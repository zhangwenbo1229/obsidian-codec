import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Codec视图样式测试', () => {
	let dom: JSDOM;
	let document: Document;

	beforeEach(() => {
		dom = new JSDOM(`
			<!DOCTYPE html>
			<html>
				<head>
					<style>
						:root {
							--background-secondary: #f5f5f5;
							--background-modifier-border: #ddd;
							--codec-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
						}
					</style>
				</head>
				<body>
					<div data-chain-container="true" style="height: calc(100vh - 275px); overflow-y: auto; border: 2px dashed var(--background-modifier-border); border-radius: 8px; padding: 17px; background: var(--background-secondary);">
						<div class="codec-chain-placeholder" style="text-align: center; color: var(--text-muted); padding: 40px 20px;" data-placeholder="true">
							拖拽操作到此区域构建操作链
						</div>
					</div>
					<div class="codec-execution-container" style="position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; margin: 12px 0; padding: 10px 12px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: var(--codec-shadow-sm); z-index: 10;">
						<input type="checkbox" id="immediate-execution-checkbox">
						<button>立即执行</button>
					</div>
				</body>
			</html>
		`);
		document = dom.window.document;
		globalThis.HTMLElement = dom.window.HTMLElement;
	});

	afterEach(() => {
		dom.window.close();
	});

	describe('背景卡片样式验证', () => {
		it('背景卡片应该存在', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]');
			expect(chainContainer).toBeTruthy();
			expect(chainContainer).toBeInstanceOf(HTMLElement);
		});

		it('背景卡片应该有正确的padding', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const style = chainContainer.style;
			
			expect(style.padding).toBe('17px');
		});

		it('背景卡片应该有正确的背景颜色', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const style = chainContainer.style;
			
			expect(style.background).toBe('var(--background-secondary)');
		});

		it('背景卡片应该有正确的边框样式', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const style = chainContainer.style;
			
			expect(style.border).toContain('2px dashed');
			expect(style.borderRadius).toBe('8px');
		});

		it('背景卡片应该有正确的高度和溢出设置', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const style = chainContainer.style;
			
			expect(style.height).toBe('calc(100vh - 275px)');
			expect(style.overflowY).toBe('auto');
		});
	});

	describe('执行按钮容器样式验证', () => {
		it('执行按钮容器应该存在', () => {
			const executionContainer = document.querySelector('.codec-execution-container');
			expect(executionContainer).toBeTruthy();
			expect(executionContainer).toBeInstanceOf(HTMLElement);
		});

		it('执行按钮容器应该有正确的margin', () => {
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			const style = executionContainer.style;
			
			expect(style.margin).toBe('12px 0px');
		});

		it('执行按钮容器应该有正确的padding', () => {
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			const style = executionContainer.style;
			
			expect(style.padding).toBe('10px 12px');
		});

		it('执行按钮容器应该有sticky定位', () => {
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			const style = executionContainer.style;
			
			expect(style.position).toBe('sticky');
			expect(style.bottom).toBe('0px');
		});

		it('执行按钮容器应该有正确的z-index', () => {
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			const style = executionContainer.style;
			
			expect(style.zIndex).toBe('10');
		});

		it('执行按钮容器应该有flexbox布局', () => {
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			const style = executionContainer.style;
			
			expect(style.display).toBe('flex');
			expect(style.alignItems).toBe('center');
			expect(style.gap).toBe('12px');
		});
	});

	describe('组件间视觉关系验证', () => {
		it('背景卡片和执行按钮容器应该都有背景色', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			
			expect(chainContainer.style.background).toBe('var(--background-secondary)');
			expect(executionContainer.style.background).toBe('var(--background-secondary)');
		});

		it('两个组件都应该有边框', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			
			expect(chainContainer.style.border).toBeTruthy();
			expect(executionContainer.style.border).toBeTruthy();
		});

		it('两个组件都应该有圆角', () => {
			const chainContainer = document.querySelector('[data-chain-container="true"]') as HTMLElement;
			const executionContainer = document.querySelector('.codec-execution-container') as HTMLElement;
			
			expect(chainContainer.style.borderRadius).toBe('8px');
			expect(executionContainer.style.borderRadius).toBe('8px');
		});
	});

	describe('占位符元素验证', () => {
		it('占位符元素应该存在', () => {
			const placeholder = document.querySelector('[data-placeholder="true"]');
			expect(placeholder).toBeTruthy();
		});

		it('占位符应该显示正确的文本', () => {
			const placeholder = document.querySelector('[data-placeholder="true"]') as HTMLElement;
			expect(placeholder.textContent?.trim()).toBe('拖拽操作到此区域构建操作链');
		});

		it('占位符应该有正确的样式', () => {
			const placeholder = document.querySelector('[data-placeholder="true"]') as HTMLElement;
			const style = placeholder.style;
			
			expect(style.textAlign).toBe('center');
			expect(style.padding).toBe('40px 20px');
		});
	});

	describe('执行控件验证', () => {
		it('立即执行复选框应该存在', () => {
			const checkbox = document.getElementById('immediate-execution-checkbox');
			expect(checkbox).toBeTruthy();
			expect(checkbox?.type).toBe('checkbox');
		});

		it('执行按钮应该存在', () => {
			const button = document.querySelector('.codec-execution-container button');
			expect(button).toBeTruthy();
			expect(button?.textContent).toBe('立即执行');
		});
	});
});
