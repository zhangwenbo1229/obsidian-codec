// SVG 图标组件

export const SVG_ICONS = {
	// 保存图标
	save: `<svg class="svg-icon" viewBox="0 0 24 24">
		<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
		<polyline points="17 21 17 13 7 13 7 21"></polyline>
	</svg>`,
	
	// 替换/交换图标
	swap: `<svg class="svg-icon" viewBox="0 0 24 24">
		<polyline points="16 3 21 8 21 8"></polyline>
		<polyline points="21 16 21 21 21 21"></polyline>
		<polyline points="8 3 3 8 3 8"></polyline>
		<polyline points="3 16 3 21 3 21"></polyline>
	</svg>`,
	
	// 复制图标
	copy: `<svg class="svg-icon" viewBox="0 0 24 24">
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
	</svg>`,
	
	// 执行/播放图标
	play: `<svg class="svg-icon" viewBox="0 0 24 24">
		<polygon points="5 3 19 12 5 21 5 3"></polygon>
	</svg>`,
	
	// 保存操作链图标
	saveChain: `<svg class="svg-icon" viewBox="0 0 24 24">
		<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
		<polyline points="17 21 17 13 7 13 7 21"></polyline>
		<path d="M7 3h8"></path>
	</svg>`,
	
	// 历史/时间线图标
	history: `<svg class="svg-icon" viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="10"></circle>
		<polyline points="12 6 12 12 16 14"></polyline>
	</svg>`,
	
	// 清空/垃圾桶图标
	trash: `<svg class="svg-icon" viewBox="0 0 24 24">
		<polyline points="3 6 5 6 21 6"></polyline>
		<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
	</svg>`
};

// 图标名称映射
export const ICON_NAMES = {
	save: '保存到文件',
	swap: '替换为输入', 
	copy: '复制到剪贴板',
	play: '执行操作链',
	saveChain: '保存操作链',
	history: '历史记录',
	trash: '清空操作链'
} as const;