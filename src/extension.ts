import type { ExtensionContext } from 'vscode';
import { version as codeVersion, env, ExtensionMode, Uri, window } from 'vscode';
import { isWeb } from '@env/platform';
import { fromOutputLevel } from './config';
import { Container } from './container';
import { configuration, Configuration } from './system/configuration';
import { Logger } from './system/logger';
import { satisfies } from './system/version';

export function activate(context: ExtensionContext) {
	const extensionVersion: string = context.extension.packageJSON.version;
	const prerelease = satisfies(extensionVersion, '> 2023.0.0');

	Logger.configure(
		{
			name: 'Restore Editors',
			createChannel: function (name: string) {
				return window.createOutputChannel(name);
			},
			toLoggable: function (o: any) {
				if (o instanceof Uri) return `Uri(${o.toString(true)})`;
				return undefined;
			},
		},
		fromOutputLevel(configuration.get('outputLevel')),
		context.extensionMode === ExtensionMode.Development,
	);

	Logger.log(
		`Restore Editors${prerelease ? ' (pre-release)' : ''} v${extensionVersion} activating in ${
			env.appName
		}(${codeVersion}) on the ${isWeb ? 'web' : 'desktop'}`,
	);

	Configuration.configure(context);
	Container.create(context);
}

export function deactivate() {
	// nothing to do
}
