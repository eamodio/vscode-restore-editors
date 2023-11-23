import type { ExtensionContext } from 'vscode';
import { version as codeVersion, env, ExtensionMode, Uri, window } from 'vscode';
import { isWeb } from '@env/platform';
import { fromOutputLevel } from './config';
import { Container } from './container';
import { configuration, Configuration } from './system/configuration';
import { getLoggableName, Logger } from './system/logger';
import { Stopwatch } from './system/stopwatch';
import { satisfies } from './system/version';

export function activate(context: ExtensionContext) {
	const extensionVersion: string = context.extension.packageJSON.version;
	const prerelease = satisfies(extensionVersion, '> 2023.0.0');

	const logLevel = fromOutputLevel(configuration.get('outputLevel'));
	Logger.configure(
		{
			name: 'Restore Editors',
			createChannel: function (name: string) {
				const channel = window.createOutputChannel(name);
				context.subscriptions.push(channel);

				if (logLevel === 'error' || logLevel === 'warn') {
					channel.appendLine(
						`Restore Editors${prerelease ? ' (pre-release)' : ''} v${extensionVersion} activating in ${
							env.appName
						} (${codeVersion}) on the ${isWeb ? 'web' : 'desktop'}; language='${
							env.language
						}', logLevel='${logLevel}'`,
					);
					channel.appendLine(
						'To enable debug logging, set `"gitlens.outputLevel: "debug"` or run "GitLens: Enable Debug Logging" from the Command Palette',
					);
				}
				return channel;
			},
			toLoggable: function (o: any) {
				if (o instanceof Uri) return `Uri(${o.toString(true)})`;

				if ('uri' in o && o.uri instanceof Uri) {
					return `${
						'name' in o && 'index' in o ? 'WorkspaceFolder' : getLoggableName(o)
					}(uri=${o.uri.toString(true)})`;
				}

				return undefined;
			},
		},
		fromOutputLevel(configuration.get('outputLevel')),
		context.extensionMode === ExtensionMode.Development,
	);

	const sw = new Stopwatch(`Restore Editors${prerelease ? ' (pre-release)' : ''} v${extensionVersion}`, {
		log: {
			message: `activating in ${env.appName} (${codeVersion}) on the ${isWeb ? 'web' : 'desktop'}; language='${
				env.language
			}', logLevel='${logLevel}'`,
		},
	});

	Configuration.configure(context);
	Container.create(context, prerelease, extensionVersion);

	sw.stop({ message: 'activated' });
}

export function deactivate() {
	// nothing to do
}
