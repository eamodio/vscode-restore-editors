import type { MessageItem } from 'vscode';
import { window } from 'vscode';
import type { Commands, UnqualifiedPaletteCommands } from '../../constants';
import { extensionPrefix } from '../../constants';
import { Logger } from '../logger';
import { LogLevel } from '../logger.constants';

type CommandCallback<T extends keyof Commands> = (this: any, ...args: Commands[T]) => any;

export function createCommandDecorator<T extends UnqualifiedPaletteCommands>(
	registry: Command<`${typeof extensionPrefix}.${T}`>[],
): (command: T, options?: CommandOptions) => (this: any, ...args: any[]) => any {
	return (command: T, options?: CommandOptions) => _command<T>(registry, command, options);
}

export interface CommandOptions {
	args?(...args: any[]): any[];
	customErrorHandling?: boolean;
	showErrorMessage?: string;
}

export interface Command<T extends keyof Commands> {
	name: T;
	key: string;
	method: CommandCallback<T>;
	options?: CommandOptions;
}

function _command<T extends UnqualifiedPaletteCommands>(
	registry: Command<`${typeof extensionPrefix}.${T}`>[],
	command: T,
	options?: CommandOptions,
) {
	return (_target: any, key: string, descriptor: PropertyDescriptor) => {
		if (typeof descriptor.value !== 'function') throw new Error('not supported');

		let method;
		if (!options?.customErrorHandling) {
			method = async function (this: any, ...args: any[]) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return await descriptor.value.apply(this, options?.args?.(args) ?? args);
				} catch (ex) {
					Logger.error(ex);

					if (options?.showErrorMessage) {
						if (Logger.enabled(LogLevel.Error)) {
							const actions: MessageItem[] = [{ title: 'Open Output Channel' }];

							const result = await window.showErrorMessage(
								`${options.showErrorMessage} \u00a0\u2014\u00a0 ${ex.toString()}`,
								...actions,
							);
							if (result === actions[0]) {
								Logger.showOutputChannel();
							}
						} else {
							void window.showErrorMessage(
								`${options.showErrorMessage} \u00a0\u2014\u00a0 ${ex.toString()}`,
							);
						}
					}

					return undefined;
				}
			};
		} else {
			method = descriptor.value;
		}

		registry.push({
			name: `${extensionPrefix}.${command}`,
			key: key,
			method: method,
			options: options,
		});
	};
}
