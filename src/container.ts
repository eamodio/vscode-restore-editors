import type { ConfigurationChangeEvent, Disposable, ExtensionContext } from 'vscode';
import { ExtensionMode } from 'vscode';
import { CommandProvider } from './commands';
import { fromOutputLevel } from './config';
import { LayoutManager } from './layoutManager';
import { configuration } from './system/configuration';
import { memoize } from './system/decorators/memoize';
import { Keyboard } from './system/keyboard';
import { Logger } from './system/logger';
import { Storage } from './system/storage';
import { LayoutsView } from './views/layouts/layoutsView';

export class Container {
	static #instance: Container | undefined;
	static #proxy = new Proxy<Container>({} as Container, {
		get: function (target, prop) {
			// In case anyone has cached this instance
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			if (Container.#instance != null) return (Container.#instance as any)[prop];

			// Allow access to config before we are initialized
			if (prop === 'config') return configuration.getAll();

			// debugger;
			throw new Error('Container is not initialized');
		},
	});

	static create(context: ExtensionContext, prerelease: boolean, version: string) {
		if (Container.#instance != null) throw new Error('Container is already initialized');

		Container.#instance = new Container(context, prerelease, version);
		return Container.#instance;
	}

	static get instance(): Container {
		return Container.#instance ?? Container.#proxy;
	}

	private constructor(context: ExtensionContext, prerelease: boolean, version: string) {
		this._context = context;
		this._prerelease = prerelease;
		this._version = version;

		const disposables: Disposable[] = [
			(this._storage = new Storage(context)),
			(this._keyboard = new Keyboard()),
			(this._layoutManager = new LayoutManager(this, this._storage)),
			new CommandProvider(this),
			new LayoutsView(this),
			configuration.onDidChangeAny(this.onAnyConfigurationChanged, this),
		];

		context.subscriptions.push({
			dispose: () => disposables.reverse().forEach(d => void d.dispose()),
		});
	}

	private readonly _context: ExtensionContext;
	get context() {
		return this._context;
	}

	@memoize()
	get debugging() {
		return this._context.extensionMode === ExtensionMode.Development;
	}

	private readonly _keyboard: Keyboard;
	get keyboard() {
		return this._keyboard;
	}

	private readonly _prerelease;
	get prerelease() {
		return this._prerelease;
	}

	@memoize()
	get prereleaseOrDebugging() {
		return this._prerelease || this.debugging;
	}

	private readonly _layoutManager: LayoutManager;
	get layoutManager() {
		return this._layoutManager;
	}

	private readonly _storage: Storage;
	get storage() {
		return this._storage;
	}

	private readonly _version: string;
	get version(): string {
		return this._version;
	}

	private onAnyConfigurationChanged(e: ConfigurationChangeEvent) {
		if (configuration.changed(e, 'outputLevel')) {
			Logger.logLevel = fromOutputLevel(configuration.get('outputLevel'));
		}
	}
}

export function isContainer(container: any): container is Container {
	return container instanceof Container;
}
