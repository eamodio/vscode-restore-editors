import type { TextDocumentShowOptions } from 'vscode';
import type { LayoutNode, LayoutsView, LayoutTabNode } from './views/layoutsView';

export const extensionPrefix = 'restoreEditors';

type StripPrefix<T extends string, S extends '.' | ':'> = T extends `${typeof extensionPrefix}${S}${infer U}`
	? U
	: never;

type StripViewPrefix<T extends string> = T extends `${ViewIds}.${infer U}` ? U : never;

export type Commands = {
	'restoreEditors.views.layouts.save': [] | [LayoutNode | undefined];
	'restoreEditors.views.layouts.layout.delete': [LayoutNode];
	'restoreEditors.views.layouts.layout.rename': [LayoutNode];
	'restoreEditors.views.layouts.layout.replace': [LayoutNode];
	'restoreEditors.views.layouts.layout.restore': [LayoutNode];
	'restoreEditors.views.layouts.tab.delete': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.preview': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.restore': [LayoutTabNode];
	'restoreEditors.delete': [] | [string | undefined];
	'restoreEditors.rename': [] | [string | undefined] | [string, string];
	'restoreEditors.replace': [] | [string | undefined];
	'restoreEditors.restore': [] | [string | undefined];
	'restoreEditors.save': [] | [string | undefined];
} & {
	[key in `${ViewIds}.focus`]: [] | [TextDocumentShowOptions | undefined];
} & {
	[key in `${ViewIds}.${'refresh' | 'resetLocation'}`]: [];
} & {
	[key in `${typeof extensionPrefix}.key.${Keys}`]: [];
};

export type CommandsUnqualified = StripPrefix<keyof Commands, '.'>;
export type ViewCommandsUnqualified = StripViewPrefix<keyof Commands>;

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

export const enum ContextValues {
	Layout = 'restoreEditors:layout',
	LayoutTab = 'restoreEditors:layout:tab',
}

export type View = LayoutsView;

export type ViewIds = `${typeof extensionPrefix}.views.layouts`;
