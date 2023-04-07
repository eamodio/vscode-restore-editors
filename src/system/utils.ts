import type { TextDocumentShowOptions, TextEditor } from 'vscode';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import { executeCoreCommand } from './command';
import { configuration } from './configuration';
import { Logger } from './logger';

export async function openEditor(uri: Uri, options?: TextDocumentShowOptions): Promise<TextEditor | undefined> {
	try {
		const document = await workspace.openTextDocument(uri);
		return window.showTextDocument(document, {
			preserveFocus: false,
			preview: configuration.get('openPreview'),
			viewColumn: ViewColumn.Active, //configuration.get('openSideBySide') ? ViewColumn.Beside : ViewColumn.Active,
			...options,
		});
	} catch (ex) {
		Logger.error(ex, 'openEditor');
		return undefined;
	}
}

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
