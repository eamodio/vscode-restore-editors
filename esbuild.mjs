import * as esbuild from 'esbuild';
import eslint from 'esbuild-plugin-eslint';
import swcMinify from 'esbuild-plugin-swc-minify';
import { typecheckPlugin } from '@jgoz/esbuild-plugin-typecheck';
import * as fs from 'fs';
import * as path from 'path';
// import { minify } from 'terser';
import { minify } from '@swc/core';
import { URL } from 'url';

const __dirname = new URL('.', import.meta.url).pathname.substring(1);

const args = process.argv.slice(2);

let index = args.indexOf('--mode');
const mode = (index >= 0 ? args[index + 1] : undefined) || 'none';

const watch = args.includes('--watch');
const check = !args.includes('--no-check');

/**
 * @param { 'node' | 'webworker' } target
 * @param { 'production' | 'development' | 'none' } mode
 */
async function buildExtension(target, mode) {
	let plugins = [
		swcMinify({
			compress: {
				drop_debugger: true,
				ecma: 2022,
				module: true,
			},
			ecma: 2022,
			format: {
				comments: false,
				ecma: 2022,
			},
			// Keep the class names otherwise @log won't provide a useful name
			keep_classnames: true,
			module: true,
			sourceMap: mode !== 'production',
		}),
	];

	if (check) {
		plugins.push(typecheckPlugin(), eslint());
	}

	const alias = {
		'@env': path.resolve(__dirname, 'src', 'env', target === 'webworker' ? 'browser' : target),
	};

	if (target === 'webworker') {
		alias.path = 'path-browserify';
		alias.os = 'os-browserify/browser';
	}

	const out = target === 'webworker' ? 'dist/browser' : 'dist';

	const options = {
		bundle: true,
		entryPoints: ['src/extension.ts'],
		entryNames: '[dir]/restore-editors',
		alias: alias,
		drop: ['debugger'],
		external: ['vscode'],
		format: 'cjs', //'esm',
		keepNames: true,
		legalComments: 'none',
		logLevel: 'info',
		mainFields: target === 'webworker' ? ['browser', 'module', 'main'] : ['module', 'main'],
		metafile: true,
		minify: mode === 'production',
		outdir: out,
		platform: target === 'webworker' ? 'browser' : target,
		sourcemap: mode !== 'production',
		target: ['es2022', 'chrome114', 'node18.15.0'],
		treeShaking: true,
		tsconfig: target === 'webworker' ? 'tsconfig.browser.json' : 'tsconfig.json',
		plugins: plugins,
	};

	if (watch) {
		const ctx = await esbuild.context(options);
		await ctx.watch();
	} else {
		let result = await esbuild.build(options);

		if (!fs.existsSync(path.join('dist', 'meta'))) {
			fs.mkdirSync(path.join('dist', 'meta'));
		}
		fs.writeFileSync(
			path.join('dist', 'meta', `restore-editors${target === 'webworker' ? '.browser' : ''}.json`),
			JSON.stringify(result.metafile),
		);

		if (mode === 'production') {
			const file = path.join(out, 'restore-editors.js');
			// console.log(`Minifying ${file}...`);

			const start = Date.now();
			const startingSize = fs.statSync(file).size;

			const code = fs.readFileSync(file, 'utf8');
			const result = await minify(code, {
				compress: {
					drop_debugger: true,
					ecma: 2022,
					module: true,
				},
				ecma: 2022,
				format: {
					comments: false,
					ecma: 2022,
				},
				// Keep the class names otherwise @log won't provide a useful name
				keep_classnames: true,
				module: true,
			});

			fs.writeFileSync(file, result.code);

			const endingSize = fs.statSync(file).size;
			const delta = endingSize - startingSize;
			console.log(
				`\x1b[32mMinified in ${Date.now() - start}ms\x1b[0m`,
				`\t${file}\t`,
				`\x1b[34m${(endingSize / 1024).toFixed(2)}kb ${delta <= 0 ? `\x1b[32m(` : `\x1b[31m(+`}${(
					delta / 1024
				).toFixed(2)}kb)\x1b[0m`,
			);
		}
	}
}

try {
	await Promise.allSettled([buildExtension('node', mode), buildExtension('webworker', mode)]);
} catch (ex) {
	console.error(ex);
	process.exit(1);
}
