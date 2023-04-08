import type { QuickPickItem } from 'vscode';
import type { Commands, Keys } from '../constants';
import { executeCommand } from '../system/command';

declare module 'vscode' {
	interface QuickPickItem {
		onDidSelect?(): void;
		onDidPressKey?(key: Keys): Promise<void>;
	}
}

export class CommandQuickPickItem<T extends keyof Commands> implements QuickPickItem {
	static fromCommand<T extends keyof Commands>(label: string, command: T, args: Commands[T]): CommandQuickPickItem<T>;
	static fromCommand<T extends keyof Commands>(
		item: QuickPickItem,
		command: T,
		args: Commands[T],
	): CommandQuickPickItem<T>;
	static fromCommand<T extends keyof Commands>(
		labelOrItem: string | QuickPickItem,
		command: T,
		args: Commands[T],
	): CommandQuickPickItem<T> {
		return new CommandQuickPickItem(
			typeof labelOrItem === 'string' ? { label: labelOrItem } : labelOrItem,
			command,
			args,
		);
	}

	static is<T extends keyof Commands>(item: QuickPickItem): item is CommandQuickPickItem<T> {
		return item instanceof CommandQuickPickItem;
	}

	label!: string;
	description?: string;
	detail?: string | undefined;

	constructor(
		label: string,
		command: T,
		args: Commands[T],
		options?: {
			onDidPressKey?: (key: Keys, result: Thenable<unknown>) => void;
			suppressKeyPress?: boolean;
		},
	);
	constructor(
		item: QuickPickItem,
		command: T,
		args: Commands[T],
		options?: {
			onDidPressKey?: (key: Keys, result: Thenable<unknown>) => void;
			suppressKeyPress?: boolean;
		},
	);
	constructor(
		labelOrItem: string | QuickPickItem,
		command: T,
		args: Commands[T],
		options?: {
			onDidPressKey?: (key: Keys, result: Thenable<unknown>) => void;
			suppressKeyPress?: boolean;
		},
	);
	constructor(
		labelOrItem: string | QuickPickItem,
		protected readonly command: T,
		protected readonly args: Commands[T],
		protected readonly options?: {
			// onDidExecute?: (
			// 	options: { preserveFocus?: boolean; preview?: boolean } | undefined,
			// 	result: Thenable<unknown>,
			// ) => void;
			onDidPressKey?: (key: Keys, result: Thenable<unknown>) => void;
			suppressKeyPress?: boolean;
		},
	) {
		this.command = command;
		this.args = args;

		if (typeof labelOrItem === 'string') {
			this.label = labelOrItem;
		} else {
			Object.assign(this, labelOrItem);
		}
	}

	execute(_options?: { preserveFocus?: boolean; preview?: boolean }): Promise<unknown | undefined> {
		if (this.command === undefined) return Promise.resolve(undefined);

		const result = executeCommand(this.command, ...this.args) as Promise<unknown | undefined>;
		// this.options?.onDidExecute?.(options, result);
		return result;
	}

	async onDidPressKey(key: Keys): Promise<void> {
		if (this.options?.suppressKeyPress) return;

		const result = this.execute({ preserveFocus: true, preview: false });
		this.options?.onDidPressKey?.(key, result);
		void (await result);
	}
}
