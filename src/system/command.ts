import type { Command, Disposable } from 'vscode';
import { commands } from 'vscode';
import type { Commands, CoreCommands, TreeViewIds, UnqualifiedViewCommands } from '../constants';

export function registerCommand<T extends keyof Commands>(
	command: T,
	callback: (...args: Commands[T]) => unknown,
	thisArg?: any,
): Disposable {
	return commands.registerCommand(command, callback, thisArg);
}

export function registerViewCommand<T extends TreeViewIds, C extends UnqualifiedViewCommands>(
	id: T,
	command: C,
	callback: (...args: Commands[`${T}.${C}`]) => unknown,
	thisArg?: any,
): Disposable {
	return registerCommand(`${id}.${command}`, callback, thisArg);
}

export function createCommand<T extends keyof Commands>(command: T, title: string, ...args: Commands[T]): Command {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function createViewCommand<T extends TreeViewIds, C extends UnqualifiedViewCommands>(
	id: T,
	command: C,
	...args: Commands[`${T}.${C}`]
): Command {
	return createCommand(`${id}.${command}`, '', ...args);
}

export function executeCommand<T extends keyof Commands, U = any>(command: T, ...args: Commands[T]): Thenable<U> {
	return commands.executeCommand<U>(command, ...args);
}

export function createCoreCommand<T extends unknown[]>(command: CoreCommands, title: string, ...args: T): Command {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function executeCoreCommand<T = unknown, U = any>(command: CoreCommands, arg: T): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U> {
	return commands.executeCommand<U>(command, ...args);
}
