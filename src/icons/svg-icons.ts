// CSS 样式已迁移到 styles.css 文件中
// 此文件保留用于兼容性，内容已迁移

export const SVG_ICON_STYLES = `
/* SVG 图标基础样式 */
.svg-icon {
	width: 24px;
	height: 24px;
	display: inline-block;
	vertical-align: middle;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

/* 工具栏按钮样式 */
.toolbar-button {
	background: none;
	border: none;
	padding: 4px;
	cursor: pointer;
	border-radius: 4px;
	transition: all 0.2s;
	color: var(--codec-text-muted);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.toolbar-button:hover {
	background: var(--codec-bg-tertiary);
	color: var(--codec-primary);
}

.toolbar-button:active {
	transform: scale(0.95);
}

/* 操作链工具栏容器 */
.chain-toolbar-container {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-left: auto;
}
`;