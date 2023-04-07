import type { Disposable, TextDocumentShowOptions } from 'vscode';
import {
	TabInputCustom,
	TabInputNotebook,
	TabInputNotebookDiff,
	TabInputTerminal,
	TabInputText,
	TabInputTextDiff,
	TabInputWebview,
	window,
} from 'vscode';
import type { Container } from './container';
import type { Storage, StoredLayout, StoredTab, StoredTabCommon } from './storage';
import { executeCoreCommand } from './system/command';
import { log } from './system/decorators/log';
import { Logger } from './system/logger';
import { getLogScope } from './system/logger.scope';
import { openCustomUri, openDiffUris, openTerminalTab, openUri } from './system/utils';

export class LayoutManager implements Disposable {
	constructor(private readonly container: Container, private readonly storage: Storage) {}

	dispose() {}

	clear() {
		return this.storage.deleteWorkspace('layout');
	}

	get(): StoredLayout | undefined {
		const layout = this.storage.getWorkspace('layout');
		return layout;
	}

	@log()
	async restore() {
		const scope = getLogScope();

		try {
			const layout = this.get();
			if (!layout?.tabs.length) return;

			// Close all opened documents
			await executeCoreCommand('workbench.action.closeAllEditors');

			// Restore the layout
			if (layout.editorLayout != null) {
				await executeCoreCommand('vscode.setEditorLayout', layout.editorLayout);
			}

			for (const tab of layout.tabs) {
				try {
					await openTab(tab);
				} catch (ex) {
					debugger;
					Logger.error(
						ex,
						scope,
						`Failed to open '${tab.label}'; type=${tab.type}, tab=${JSON.stringify(tab)}`,
					);
				}
			}
		} catch (ex) {
			debugger;
			Logger.error(ex, scope);
		}
	}

	async save() {
		try {
			const data: Partial<StoredLayout> = {
				v: 1,
				tabs: [],
			};

			for (const group of window.tabGroups.all) {
				let i = 0;
				for (const tab of group.tabs) {
					const { input } = tab;
					if (input == null) continue;

					const common: StoredTabCommon = {
						label: tab.label,
						active: tab.isActive,
						groupActive: group.isActive,
						preview: tab.isPreview,
						order: i++,
						column: group.viewColumn,
					};

					if (input instanceof TabInputText) {
						data.tabs!.push({
							...common,
							type: 'text',
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputTextDiff) {
						data.tabs!.push({
							...common,
							type: 'diff',
							uri: input.modified.toString(),
							original: input.original.toString(),
						});
					} else if (input instanceof TabInputCustom) {
						data.tabs!.push({
							...common,
							type: 'custom',
							id: input.viewType,
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputWebview) {
						data.tabs!.push({
							...common,
							type: 'webview',
							id: input.viewType,
						});
					} else if (input instanceof TabInputNotebook) {
						data.tabs!.push({
							...common,
							type: 'notebook',
							id: input.notebookType,
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputNotebookDiff) {
						data.tabs!.push({
							...common,
							type: 'notebook-diff',
							id: input.notebookType,
							uri: input.modified.toString(),
							original: input.original.toString(),
						});
					} else if (input instanceof TabInputTerminal) {
						data.tabs!.push({
							...common,
							type: 'terminal',
						});
					} else {
						debugger;
					}
				}
			}

			data.editorLayout = await executeCoreCommand('vscode.getEditorLayout');
			await this.storage.storeWorkspace('layout', data);
		} catch (ex) {
			Logger.error(ex, 'DocumentManager.save');
		}
	}
}

export async function openTab(tab: StoredTab, options?: TextDocumentShowOptions) {
	switch (tab.type) {
		case 'text':
		case 'notebook':
			await openUri(tab.uri, tab.label, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		case 'custom':
			await openCustomUri(tab.uri, tab.label, tab.id, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
				viewColumn: options?.viewColumn ?? tab.column,
			});
			break;
		case 'diff':
		case 'notebook-diff':
			await openDiffUris(tab.uri, tab.original, tab.label, {
				background: options == null ? !tab.active : false,
				preserveFocus: options?.preserveFocus ?? !(tab.active && tab.groupActive),
				preview: options?.preview ?? tab.preview,
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
