import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'src/**/__tests__/**/*.ts',
		'src/**/*.test.ts',
	]),
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-deprecated': 'warn',
			'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-misused-promises': 'warn',
			'@typescript-eslint/no-floating-promises': 'warn',
			'no-case-declarations': 'warn',
			'no-alert': 'warn',
			'@microsoft/sdl/no-inner-html': 'warn',
			'obsidianmd/prefer-create-el': 'warn',
			'obsidianmd/prefer-active-window-timers': 'warn',
			'obsidianmd/prefer-active-doc': 'warn',
			'obsidianmd/no-static-styles-assignment': 'warn',
			'obsidianmd/ui/sentence-case': 'warn',
			'obsidianmd/rule-custom-message': 'warn',
		},
	},
);
