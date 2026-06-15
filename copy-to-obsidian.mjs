import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = __dirname;
const targetDir = 'C:\\tools\\codetest\\test\\.obsidian\\plugins\\obsidian-codec';

const filesToCopy = [
	'main.js',
	'manifest.json',
	'styles.css'
];

console.log('🔧 开始复制插件文件到 Obsidian 目录...');

try {
	filesToCopy.forEach(file => {
		const sourcePath = path.join(sourceDir, file);
		const targetPath = path.join(targetDir, file);
		
		if (fs.existsSync(sourcePath)) {
			fs.copyFileSync(sourcePath, targetPath);
			console.log(`✅ 已复制: ${file}`);
		} else {
			console.log(`❌ 文件不存在: ${file}`);
		}
	});
	
	console.log(`🎉 插件文件已复制到: ${targetDir}`);
	console.log('🚀 现在可以在 Obsidian 中重新加载插件查看效果！');
} catch (error) {
	console.error('❌ 复制失败:', error);
	process.exit(1);
}