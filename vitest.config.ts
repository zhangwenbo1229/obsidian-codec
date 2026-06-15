import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/__tests__/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/__tests__/',
				'**/*.test.ts',
				'**/*.config.*',
				'dist/'
			]
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@tests': path.resolve(__dirname, './src/__tests__'),
			'obsidian': path.resolve(__dirname, './node_modules/obsidian/obsidian.d.ts')
		}
	},
	define: {
		'process.env.NODE_ENV': '"test"'
	}
});