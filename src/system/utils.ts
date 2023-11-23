import type { TextDocumentShowOptions, ViewColumn } from 'vscode';
import { Uri } from 'vscode';
import type { StoredTab } from '../constants';
import { executeCoreCommand } from './command';

export async function openCustomUri(
	uri: string | Uri,
	label: string,
	viewId: string,
	options?: TextDocumentShowOptions & { background?: boolean },
): Promise<void> {
	return executeCoreCommand(
		'vscode.openWith',
		typeof uri === 'string' ? Uri.parse(uri) : uri,
		viewId,
		options,
		label,
	);
}

export async function openDiffUris(
	uri: string | Uri,
	original: string | Uri,
	label: string,
	options?: TextDocumentShowOptions & { background?: boolean },
): Promise<void> {
	return executeCoreCommand(
		'vscode.diff',
		typeof original === 'string' ? Uri.parse(original) : original,
		typeof uri === 'string' ? Uri.parse(uri) : uri,
		label,
		options,
	);
}

export async function openTab(tab: StoredTab, options?: TextDocumentShowOptions) {
	switch (tab.type) {
		case 'text':
		case 'notebook':
			await openUri(tab.uri, tab.label, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
				selection: options?.selection,
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		case 'custom':
			await openCustomUri(tab.uri, tab.label, tab.id, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
				selection: options?.selection,
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		case 'diff':
		case 'notebook-diff':
			await openDiffUris(tab.uri, tab.original, tab.label, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
				selection: options?.selection,
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		case 'terminal':
			await openTerminalTab(tab.label, {
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		// case 'webview':
		// 	await openWebview(tab);
		// 	break;
	}
}

export async function openTerminalTab(_label: string, options?: { preserveFocus?: boolean; viewColumn: ViewColumn }) {
	return executeCoreCommand(
		'workbench.action.createTerminalEditor',
		options != null ? { location: options } : { location: 2 /* Editor */ },
	);
}

export async function openUri(
	uri: string | Uri,
	label: string,
	options?: TextDocumentShowOptions & { background?: boolean },
): Promise<void> {
	return executeCoreCommand('vscode.open', typeof uri === 'string' ? Uri.parse(uri) : uri, options, label);
}
