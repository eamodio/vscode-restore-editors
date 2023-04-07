//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const { spawnSync } = require('child_process');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CircularDependencyPlugin = require('circular-dependency-plugin');
const { CleanWebpackPlugin: CleanPlugin } = require('clean-webpack-plugin');
const esbuild = require('esbuild');
const { EsbuildPlugin } = require('esbuild-loader');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const fs = require('fs');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { optimize, WebpackError } = require('webpack');

module.exports =
	/**
	 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; esbuildMinify?: boolean } | undefined } env
	 * @param {{ mode: 'production' | 'development' | 'none' | undefined }} argv
	 * @returns { WebpackConfig[] }
	 */
	function (env, argv) {
		const mode = argv.mode || 'none';

		env = {
			analyzeBundle: false,
			analyzeDeps: false,
			esbuild: true,
			esbuildMinify: false,
			...env,
		};

		return [getExtensionConfig('node', mode, env), getExtensionConfig('webworker', mode, env)];
	};

/**
 * @param { 'node' | 'webworker' } target
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; esbuildMinify?: boolean } } env
 * @returns { WebpackConfig }
 */
function getExtensionConfig(target, mode, env) {
	/**
	 * @type WebpackConfig['plugins'] | any
	 */
	const plugins = [
		new CleanPlugin(),
		new ForkTsCheckerPlugin({
			async: false,
			eslint: {
				enabled: true,
				files: 'src/**/*.ts?(x)',
				options: {
					cache: true,
					cacheLocation: path.join(__dirname, '.eslintcache/', target === 'webworker' ? 'browser/' : ''),
					cacheStrategy: 'content',
					fix: mode !== 'production',
					overrideConfigFile: path.join(
						__dirname,
						target === 'webworker' ? '.eslintrc.browser.json' : '.eslintrc.json',
					),
				},
			},
			formatter: 'basic',
			typescript: {
				configFile: path.join(__dirname, target === 'webworker' ? 'tsconfig.browser.json' : 'tsconfig.json'),
			},
		}),
	];

	if (target === 'webworker') {
		plugins.push(new optimize.LimitChunkCountPlugin({ maxChunks: 1 }));
	}

	if (env.analyzeDeps) {
		plugins.push(
			new CircularDependencyPlugin({
				cwd: __dirname,
				exclude: /node_modules/,
				failOnError: false,
				onDetected: function ({ module: _webpackModuleRecord, paths, compilation }) {
					if (paths.some(p => p.includes('container.ts'))) return;

					// @ts-ignore
					compilation.warnings.push(new WebpackError(paths.join(' -> ')));
				},
			}),
		);
	}

	if (env.analyzeBundle) {
		const out = path.join(__dirname, 'out');
		if (!fs.existsSync(out)) {
			fs.mkdirSync(out);
		}

		plugins.push(
			new BundleAnalyzerPlugin({
				analyzerMode: 'static',
				generateStatsFile: true,
				openAnalyzer: false,
				reportFilename: path.join(out, `extension-${target}-bundle-report.html`),
				statsFilename: path.join(out, 'stats.json'),
			}),
		);
	}

	return {
		name: `extension:${target}`,
		entry: {
			extension: './src/extension.ts',
		},
		mode: mode,
		target: target,
		devtool: mode === 'production' ? false : 'source-map',
		output: {
			chunkFilename: 'feature-[name].js',
			filename: 'restore-editors.js',
			libraryTarget: 'commonjs2',
			path: target === 'webworker' ? path.join(__dirname, 'dist', 'browser') : path.join(__dirname, 'dist'),
		},
		optimization: {
			minimizer: [
				env.esbuildMinify
					? new EsbuildPlugin({
							drop: ['debugger'],
							format: 'cjs',
							// Keep the class names otherwise @log won't provide a useful name
							keepNames: true,
							legalComments: 'none',
							minify: true,
							target: 'es2022',
							treeShaking: true,
					  })
					: new TerserPlugin({
							extractComments: false,
							parallel: true,
							terserOptions: {
								compress: {
									drop_debugger: true,
									ecma: 2020,
									module: true,
								},
								ecma: 2020,
								format: {
									comments: false,
									ecma: 2020,
								},
								// Keep the class names otherwise @log won't provide a useful name
								keep_classnames: true,
								module: true,
							},
					  }),
			],
			splitChunks:
				target === 'webworker'
					? false
					: {
							// Disable all non-async code splitting
							chunks: () => false,
							cacheGroups: {
								default: false,
								vendors: false,
							},
					  },
		},
		externals: {
			vscode: 'commonjs vscode',
		},
		module: {
			rules: [
				{
					exclude: /\.d\.ts$/,
					include: path.join(__dirname, 'src'),
					test: /\.tsx?$/,
					use: env.esbuild
						? {
								loader: 'esbuild-loader',
								options: {
									format: 'esm',
									implementation: esbuild,
									target: ['es2022', 'chrome102', 'node16.14.2'],
									tsconfig: path.join(
										__dirname,
										target === 'webworker' ? 'tsconfig.browser.json' : 'tsconfig.json',
									),
								},
						  }
						: {
								loader: 'ts-loader',
								options: {
									configFile: path.join(
										__dirname,
										target === 'webworker' ? 'tsconfig.browser.json' : 'tsconfig.json',
									),
									experimentalWatchApi: true,
									transpileOnly: true,
								},
						  },
				},
			],
		},
		resolve: {
			alias: {
				'@env': path.resolve(__dirname, 'src', 'env', target === 'webworker' ? 'browser' : target),
			},
			fallback:
				target === 'webworker'
					? { path: require.resolve('path-browserify'), os: require.resolve('os-browserify/browser') }
					: undefined,
			mainFields: target === 'webworker' ? ['browser', 'module', 'main'] : ['module', 'main'],
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
		},
		plugins: plugins,
		infrastructureLogging:
			mode === 'production'
				? undefined
				: {
						level: 'log', // enables logging required for problem matchers
				  },
		stats: {
			preset: 'errors-warnings',
			assets: true,
			assetsSort: 'name',
			assetsSpace: 100,
			colors: true,
			env: true,
			errorsCount: true,
			warningsCount: true,
			timings: true,
		},
	};
}
