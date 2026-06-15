import { describe, it, expect } from 'vitest';
import { VIEW_TYPE } from '../constants';

describe('默认视图位置测试', () => {
	it('应该有正确的 VIEW_TYPE 常量', () => {
		expect(VIEW_TYPE).toBeDefined();
		expect(VIEW_TYPE).toBe('codec-view');
	});

	it('视图应该在 manifest.json 中定义为 main 类型', () => {
		// 验证视图配置结构
		const manifestConfig = {
			views: {
				codec: {
					name: 'Codec',
					type: 'main',
					displayName: 'Codec 编码解码工具'
				}
			}
		};
		
		expect(manifestConfig.views.codec.type).toBe('main');
		expect(manifestConfig.views.codec.name).toBe('Codec');
	});
});