import type { Disposable, Event, ExtensionContext, SecretStorageChangeEvent, ViewColumn } from 'vscode';
import { EventEmitter } from 'vscode';
import { extensionPrefix } from './constants';
import { debug } from './system/decorators/log';

export type StorageChangeEvent =
	| {
			/**
			 * The key of the stored value that has changed.
			 */
			readonly key: keyof (GlobalStorage & DeprecatedGlobalStorage);
			readonly workspace: false;
	  }
	| {
			/**
			 * The key of the stored value that has changed.
			 */
			readonly key: keyof (WorkspaceStorage & DeprecatedWorkspaceStorage);
			readonly workspace: true;
	  };

export class Storage implements Disposable {
	private _onDidChange = new EventEmitter<StorageChangeEvent>();
	get onDidChange(): Event<StorageChangeEvent> {
		return this._onDidChange.event;
	}

	private _onDidChangeSecrets = new EventEmitter<SecretStorageChangeEvent>();
	get onDidChangeSecrets(): Event<SecretStorageChangeEvent> {
		return this._onDidChangeSecrets.event;
	}

	private readonly _disposable: Disposable;
	constructor(private readonly context: ExtensionContext) {
		this._disposable = this.context.secrets.onDidChange(e => this._onDidChangeSecrets.fire(e));
	}

	dispose(): void {
		this._disposable.dispose();
	}

	get<T extends keyof GlobalStorage>(key: T): GlobalStorage[T] | undefined;
	/** @deprecated */
	get<T extends keyof DeprecatedGlobalStorage>(key: T): DeprecatedGlobalStorage[T] | undefined;
	get<T extends keyof GlobalStorage>(key: T, defaultValue: GlobalStorage[T]): GlobalStorage[T];
	@debug({ logThreshold: 50 })
	get(key: keyof (GlobalStorage & DeprecatedGlobalStorage), defaultValue?: unknown): unknown | undefined {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		return this.context.globalState.get(`${extensionPrefix}:${key}`, defaultValue);
	}

	@debug({ logThreshold: 250 })
	async delete(key: keyof (GlobalStorage & DeprecatedGlobalStorage)): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		await this.context.globalState.update(`${extensionPrefix}:${key}`, undefined);
		this._onDidChange.fire({ key: key, workspace: false });
	}

	@debug({ args: { 1: false }, logThreshold: 250 })
	async store<T extends keyof GlobalStorage>(key: T, value: GlobalStorage[T] | undefined): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		await this.context.globalState.update(`${extensionPrefix}:${key}`, value);
		this._onDidChange.fire({ key: key, workspace: false });
	}

	@debug({ args: false, logThreshold: 250 })
	async getSecret(key: SecretKeys): Promise<string | undefined> {
		return this.context.secrets.get(key);
	}

	@debug({ args: false, logThreshold: 250 })
	async deleteSecret(key: SecretKeys): Promise<void> {
		return this.context.secrets.delete(key);
	}

	@debug({ args: false, logThreshold: 250 })
	async storeSecret(key: SecretKeys, value: string): Promise<void> {
		return this.context.secrets.store(key, value);
	}

	getWorkspace<T extends keyof WorkspaceStorage>(key: T): WorkspaceStorage[T] | undefined;
	/** @deprecated */
	getWorkspace<T extends keyof DeprecatedWorkspaceStorage>(key: T): DeprecatedWorkspaceStorage[T] | undefined;
	getWorkspace<T extends keyof WorkspaceStorage>(key: T, defaultValue: WorkspaceStorage[T]): WorkspaceStorage[T];
	@debug({ logThreshold: 25 })
	getWorkspace(
		key: keyof (WorkspaceStorage & DeprecatedWorkspaceStorage),
		defaultValue?: unknown,
	): unknown | undefined {
		return this.context.workspaceState.get(`${extensionPrefix}:${key}`, defaultValue);
	}

	@debug({ logThreshold: 250 })
	async deleteWorkspace(key: keyof (WorkspaceStorage & DeprecatedWorkspaceStorage)): Promise<void> {
		await this.context.workspaceState.update(`${extensionPrefix}:${key}`, undefined);
		this._onDidChange.fire({ key: key, workspace: true });
	}

	@debug({ args: { 1: false }, logThreshold: 250 })
	async storeWorkspace(key: keyof WorkspaceStorage, value: unknown | undefined): Promise<void> {
		await this.context.workspaceState.update(`${extensionPrefix}:${key}`, value);
		this._onDidChange.fire({ key: key, workspace: true });
	}
}

export type SecretKeys = never;

export type DeprecatedGlobalStorage = object;

export type GlobalStorage = object;

export type DeprecatedWorkspaceStorage = {
	// /** @deprecated use `editors` */
	// documents: Record<string, StoredEditor>;
};

export type WorkspaceStorage = {
	documents: StoredEditor[];
	layout: StoredLayout;
};

export interface Stored<T, SchemaVersion extends number = 1> {
	v: SchemaVersion;
	data: T;
}

export interface StoredEditor {
	uri: string;
	viewColumn?: ViewColumn;
}

export interface StoredTabCommon {
	label: string;

	active: boolean;
	groupActive: boolean;
	preview: boolean;
	column: ViewColumn;
	order: number;
}

export interface StoredTextTab extends StoredTabCommon {
	type: 'text';
	uri: string;
}

export interface StoredTextDiffTab extends StoredTabCommon {
	type: 'diff';
	uri: string;
	original: string;
}

export interface StoredCustomTab extends StoredTabCommon {
	type: 'custom';
	id: string;
	uri: string;
}

export interface StoredWebviewTab extends StoredTabCommon {
	type: 'webview';
	id: string;
}

export interface StoredNotebookTab extends StoredTabCommon {
	type: 'notebook';
	id: string;
	uri: string;
}
export interface StoredNotebookDiffTab extends StoredTabCommon {
	type: 'notebook-diff';
	id: string;
	uri: string;
	original: string;
}

export interface StoredTerminalTab extends StoredTabCommon {
	type: 'terminal';
}

export type StoredTab =
	| StoredTextTab
	| StoredTextDiffTab
	| StoredCustomTab
	| StoredWebviewTab
	| StoredNotebookTab
	| StoredNotebookDiffTab
	| StoredTerminalTab;

type EditorLayoutGroup = {
	groups?: EditorLayoutGroup[];
	size: number;
};

export interface StoredLayout<SchemaVersion extends number = 1> {
	v: SchemaVersion;

	editorLayout?: {
		groups?: EditorLayoutGroup[];
		orientation: 0 | 1;
	};
	tabs: StoredTab[];
}
