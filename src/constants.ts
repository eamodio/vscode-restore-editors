import type { TextDocumentShowOptions, ViewColumn } from 'vscode';
import type { LayoutNode } from './views/layouts/layoutNode';
import type { LayoutsView } from './views/layouts/layoutsView';
import type { LayoutTabNode } from './views/layouts/layoutTabNode';

export const extensionPrefix = 'restoreEditors';

type StripPrefix<Key extends string, Prefix extends string> = Key extends `${Prefix}${infer Rest}` ? Rest : never;

export type PaletteCommands = {
	'restoreEditors.export': [];
	'restoreEditors.import': [];
	'restoreEditors.delete': [] | [string | undefined];
	'restoreEditors.rename': [] | [string | undefined] | [string, string];
	'restoreEditors.replace': [] | [string | undefined];
	'restoreEditors.restore': [] | [string | undefined];
	'restoreEditors.save': [] | [string | undefined];
};

export type Commands = PaletteCommands & {
	'restoreEditors.views.layouts.export': [];
	'restoreEditors.views.layouts.import': [];
	'restoreEditors.views.layouts.save': [] | [LayoutNode | undefined];
	'restoreEditors.views.layouts.layout.delete': [LayoutNode];
	'restoreEditors.views.layouts.layout.rename': [LayoutNode];
	'restoreEditors.views.layouts.layout.replace': [LayoutNode];
	'restoreEditors.views.layouts.layout.restore': [LayoutNode];
	'restoreEditors.views.layouts.tab.delete': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.preview': [LayoutTabNode];
	'restoreEditors.views.layouts.tab.restore': [LayoutTabNode];
} & {
	[Key in `${TreeViewIds}.focus`]: [] | [TextDocumentShowOptions | undefined];
} & {
	[Key in `${TreeViewIds}.${'refresh' | 'resetLocation'}`]: [];
} & {
	[Key in `${typeof extensionPrefix}.key.${Keys}`]: [];
};

export type UnqualifiedPaletteCommands = StripPrefix<keyof PaletteCommands, `${typeof extensionPrefix}.`>;
export type UnqualifiedViewCommands = StripPrefix<keyof Commands, `${TreeViewIds}.`>;

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
	| 'workbench.action.nextEditor'
	| `${ViewIds}.${'focus' | 'removeView' | 'resetViewLocation' | 'toggleVisibility'}`;
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

export type SecretKeys = never;

export type DeprecatedGlobalStorage = Record<string, unknown>;

export type GlobalStorage = Record<string, unknown>;

export type DeprecatedWorkspaceStorage = {
	/** @deprecated use `layouts` */
	documents: Record<string, any>;
};

export type WorkspaceStorage = {
	layouts: Stored<Layouts>;
} & { [key in `layout:${string}`]: Stored<Layout> };

export interface Stored<T, SchemaVersion extends number = 1> {
	v: SchemaVersion;
	data: T;
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

export interface LayoutDescriptor {
	id: string;
	label: string;

	context: string | undefined;
	tabs: number;
	timestamp: number;
}

export interface Layout {
	id: string;

	editorLayout?: {
		groups?: EditorLayoutGroup[];
		orientation: 0 | 1;
	};
	tabs: StoredTab[];
}

export type Layouts = Record<string, LayoutDescriptor>;

export type TreeViewCommands = `${typeof extensionPrefix}.views.${`layouts.${
	| 'refresh'
	| 'export'
	| 'import'
	| 'save'
	| `.layout.${'delete' | 'rename' | 'replace' | 'restore' | `.tab.${'delete' | 'preview' | 'restore'}`}`}`}`;

type ExtractSuffix<Prefix extends string, U> = U extends `${Prefix}${infer V}` ? V : never;
type FilterCommands<Prefix extends string, U> = U extends `${Prefix}${infer V}` ? `${Prefix}${V}` : never;

export type TreeViewCommandsByViewId<T extends TreeViewIds> = FilterCommands<T, TreeViewCommands>;
export type TreeViewCommandsByViewType<T extends TreeViewTypes> = FilterCommands<
	`${typeof extensionPrefix}.views.${T}.`,
	TreeViewCommands
>;
export type TreeViewCommandSuffixesByViewType<T extends TreeViewTypes> = ExtractSuffix<
	`${typeof extensionPrefix}.views.${T}.`,
	FilterCommands<`${typeof extensionPrefix}.views.${T}.`, TreeViewCommands>
>;

export type TreeViewTypes = 'layouts';
export type TreeViewIds<T extends TreeViewTypes = TreeViewTypes> = `${typeof extensionPrefix}.views.${T}`;

export type TreeViewNodeTypes = 'layouts' | 'layout' | 'tab';

export type Views = LayoutsView;
export type ViewTypes = TreeViewTypes;
export type ViewIds = TreeViewIds;

export const enum ViewItemContextValues {
	Layout = 'restoreEditors:layout',
	LayoutTab = 'restoreEditors:layout:tab',
}
