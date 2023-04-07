export const extensionPrefix = 'restoreEditors';
type StripPrefix<T extends string, S extends '.' | ':'> = T extends `${typeof extensionPrefix}${S}${infer U}`
	? U
	: never;

export type Commands =
	| `${typeof extensionPrefix}.key.${Keys}`
	| `${typeof extensionPrefix}.clear`
	| `${typeof extensionPrefix}.openSavedTab`
	| `${typeof extensionPrefix}.restore`
	| `${typeof extensionPrefix}.save`;
export type CommandsUnqualified = StripPrefix<Commands, '.'>;

export type ContextKeys = `${typeof extensionPrefix}:key:${Keys}`;

export type CoreCommands =
	| 'setContext'
	| 'vscode.diff'
	| 'vscode.getEditorLayout'
	| 'vscode.open'
	| 'vscode.openWith'
	| 'vscode.setEditorLayout'
	| 'workbench.action.closeActiveEditor'
	| 'workbench.action.closeAllEditors'
	| 'workbench.action.createTerminalEditor'
	| 'workbench.action.nextEditor';

export const keys = [
	'left',
	'alt+left',
	'ctrl+left',
	'right',
	'alt+right',
	'ctrl+right',
	'alt+enter',
	'ctrl+enter',
	'escape',
] as const;
export type Keys = (typeof keys)[number];
