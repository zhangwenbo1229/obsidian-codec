import { vi } from 'vitest';

Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
	},
	writable: true
});

const mockObsidian = {
	Plugin: class MockPlugin {
		app: any;
		manifest: any;
		constructor(app: any, manifest: any) {
			this.app = app;
			this.manifest = manifest;
		}
		async onload() {}
		async onunload() {}
		addCommand() {}
		addSettingTab() {}
		addRibbonIcon() {}
		registerEvent() {}
		registerDomEvent() {}
		registerInterval() {}
		saveData() {}
		loadData() {}
	},
	ItemView: class MockItemView {
		leaf: any;
		constructor(leaf: any) {
			this.leaf = leaf;
		}
		async onLoad() {}
		async onUnload() {}
		getViewType() { return 'mock-view'; }
		getDisplayText() { return 'Mock View'; }
		getIcon() { return 'mock-icon'; }
	},
	MarkdownView: class MockMarkdownView {},
	Setting: class MockSetting {
		container: any;
		constructor(container: any) {
			this.container = container;
		}
		setName() { return this; }
		setDesc() { return this; }
		addText() { return this; }
		addToggle() { return this; }
		addDropdown() { return this; }
		onChange() { return this; }
	},
	PluginSettingTab: class MockPluginSettingTab {
		app: any;
		plugin: any;
		constructor(app: any, plugin: any) {
			this.app = app;
			this.plugin = plugin;
		}
		display() {}
	},
	Notice: class MockNotice {
		constructor(message: string) {
			this.message = message;
		}
		message: string;
	},
	Modal: class MockModal {
		app: any;
		constructor(app: any) {
			this.app = app;
		}
		open() {}
		close() {}
		onOpen() {}
		onClose() {}
	}
};

vi.mock('obsidian', () => mockObsidian);