import type { TextDocumentShowOptions } from 'vscode';
import type { LayoutNode, LayoutsView, LayoutTabNode } from './views/layoutsView';

export const extensionPrefix = 'restoreEditors';

type StripPrefix<Key extends string, Prefix extends string> = Key extends `${Prefix}${infer Rest}` ? Rest : never;

export type PaletteCommands = {
	'restoreEditors.delete': [] | [string | undefined];
	'restoreEditors.rename': [] | [string | undefined] | [string, string];
	'restoreEditors.replace': [] | [string | undefined];
	'restoreEditors.restore': [] | [string | undefined];
	'restoreEditors.save': [] | [string | undefined];
};

export type Commands = PaletteCommands & {
	'restoreEditors.views.layouts.save': [] | [LayoutNode | undefined];
	'restoreEditors.views.layouts.layout.delete': [LayoutNode];
	'restoreEditors.views.layouts.layout.rename': [LayoutNode];
	'restoreEditors.views.layouts.layout.replace': [LayoutNode];
	'restoreEditors.views.layouts.layout.restore': [LayoutNode];
	'restoreEditors.views.layouts.tab.delete': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.preview': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.restore': [LayoutTabNode];
} & {
	[Key in `${ViewIds}.focus`]: [] | [TextDocumentShowOptions | undefined];
} & {
	[Key in `${ViewIds}.${'refresh' | 'resetLocation'}`]: [];
} & {
	[Key in `${typeof extensionPrefix}.key.${Keys}`]: [];
};

export type UnqualifiedPaletteCommands = StripPrefix<keyof PaletteCommands, 'restoreEditors.'>;
export type UnqualifiedViewCommands = StripPrefix<keyof Commands, `${ViewIds}.`>;

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
