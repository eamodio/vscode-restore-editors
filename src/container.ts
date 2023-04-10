import type { ConfigurationChangeEvent, ExtensionContext } from 'vscode';
import { ExtensionMode } from 'vscode';
import { CommandProvider } from './commands';
import { fromOutputLevel } from './config';
import { LayoutManager } from './layoutManager';
import { configuration } from './system/configuration';
import { memoize } from './system/decorators/memoize';
import { Keyboard } from './system/keyboard';
import { Logger } from './system/logger';
import { Storage } from './system/storage';
import { LayoutsView } from './views/layoutsView';

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

	static create(context: ExtensionContext) {
		if (Container.#instance != null) throw new Error('Container is already initialized');

		Container.#instance = new Container(context);
		return Container.#instance;
	}

	static get instance(): Container {
		return Container.#instance ?? Container.#proxy;
	}

	private constructor(context: ExtensionContext) {
		this._context = context;

		const disposables = [
			(this._storage = new Storage(context)),
			(this._keyboard = new Keyboard()),
			(this._layoutManager = new LayoutManager(this, this._storage)),
			new CommandProvider(this),
			new LayoutsView(this),
			configuration.onDidChangeAny(this.onAnyConfigurationChanged, this),
		];

		context.subscriptions.push({
			dispose: function () {
				disposables.reverse().forEach(d => void d.dispose());
			},
		});
	}

	private _context: ExtensionContext;
	get context() {
		return this._context;
	}

	@memoize()
	get debugging() {
		return this._context.extensionMode === ExtensionMode.Development;
	}

	private _keyboard: Keyboard;
	get keyboard() {
		return this._keyboard;
	}

	private _layoutManager: LayoutManager;
	get layoutManager() {
		return this._layoutManager;
	}

	private _storage: Storage;
	get storage() {
		return this._storage;
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
