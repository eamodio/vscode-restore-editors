import type { Disposable, Event } from 'vscode';
import {
	EventEmitter,
	extensions,
	Range,
	TabInputCustom,
	TabInputNotebook,
	TabInputNotebookDiff,
	TabInputTerminal,
	TabInputText,
	TabInputTextDiff,
	TabInputWebview,
	window,
	workspace,
} from 'vscode';
import { uuid } from '@env/crypto';
import type { GitExtension } from './@types/vscode.git';
import type { Layout, LayoutDescriptor, Layouts, StoredTab, StoredTabCommon, StoredTabSelection } from './constants';
import type { Container } from './container';
import { executeCoreCommand } from './system/command';
import { configuration } from './system/configuration';
import { debug, log } from './system/decorators/log';
import { flatCount } from './system/iterable';
import { Logger } from './system/logger';
import { getLogScope } from './system/logger.scope';
import { updateRecordValue } from './system/object';
import { defer } from './system/promise';
import type { Storage } from './system/storage';
import { pluralize } from './system/string';
import { openTab } from './system/utils';

interface ExportedLayouts {
	v: 1;
	layouts: (Omit<LayoutDescriptor, 'tabs'> & Layout)[];
}

export class LayoutManager implements Disposable {
	private _onDidChange = new EventEmitter<void>();
	get onDidChange(): Event<void> {
		return this._onDidChange.event;
	}

	constructor(
		private readonly container: Container,
		private readonly storage: Storage,
	) {}

	dispose() {}

	@debug()
	get(id: string): Layout | undefined {
		const stored = this.storage.getWorkspace(`layout:${id}`);
		return stored?.data;
	}

	@debug()
	getLayouts(): LayoutDescriptor[] {
		const stored = this.storage.getWorkspace('layouts');
		return stored?.data != null ? Object.values(stored.data) : [];
	}

	@debug()
	getLayoutsById(): Layouts {
		const stored = this.storage.getWorkspace('layouts');
		return stored?.data ?? {};
	}

	@debug()
	getDescriptor(id: string): LayoutDescriptor | undefined {
		const stored = this.storage.getWorkspace('layouts');
		return stored?.data?.[id];
	}

	@log()
	async delete(id: string) {
		const scope = getLogScope();

		const descriptor = this.getDescriptor(id);
		if (descriptor == null) return;

		const confirm = { title: 'Delete' };
		const cancel = { title: 'Cancel', isCloseAffordance: true };
		const result = await window.showWarningMessage(
			`Are you sure you want to delete the layout "${descriptor.label}"?`,
			{ modal: true },
			confirm,
			cancel,
		);
		if (result !== confirm) return;

		try {
			await this.storage.deleteWorkspace(`layout:${id}`);

			const stored = this.storage.getWorkspace('layouts');
			if (stored != null) {
				stored.data = updateRecordValue<LayoutDescriptor>(stored.data, id, undefined);
				await this.storage.storeWorkspace('layouts', stored);
			}

			this._onDidChange.fire();
		} catch (ex) {
			debugger;
			Logger.error(ex, scope);
		}
	}

	@log()
	async deleteTab(id: string, tab: StoredTab) {
		const scope = getLogScope();

		try {
			const stored = this.storage.getWorkspace(`layout:${id}`);
			if (stored == null) return;

			stored.data.tabs = stored.data.tabs.filter(t => t !== tab);
			await Promise.allSettled([
				this.storage.storeWorkspace(`layout:${id}`, stored),
				this.update(id, layout => (layout.tabs = stored.data.tabs.length)),
			]);

			this._onDidChange.fire();
		} catch (ex) {
			debugger;
			Logger.error(ex, scope);
		}
	}

	async export(): Promise<void> {
		const data: ExportedLayouts = {
			v: 1,
			layouts: [],
		};

		for (const descriptor of this.getLayouts()) {
			const layout = this.get(descriptor.id);
			if (layout == null) continue;

			data.layouts.push({ ...descriptor, ...layout });
		}

		const d = await workspace.openTextDocument({ content: JSON.stringify(data, undefined, 2), language: 'json' });
		await window.showTextDocument(d);
	}

	async import(): Promise<void> {
		const uris = await window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			defaultUri: workspace.workspaceFolders?.[0].uri,
			openLabel: 'Import',
			filters: {
				JSON: ['json'],
			},
		});
		const uri = uris?.[0];
		if (uri == null) return;

		const content = await workspace.fs.readFile(uri);
		const data = JSON.parse(content.toString()) as ExportedLayouts;
		if (data.v !== 1 || !data.layouts?.length) {
			void window.showErrorMessage('Unable to import saved layouts. Invalid data format');
			return;
		}

		// prompt the user to replace or merge
		const merge = { title: 'Merge' };
		const replace = { title: 'Replace All' };
		const cancel = { title: 'Cancel', isCloseAffordance: true };
		const result = await window.showInformationMessage(
			`Will import ${pluralize(
				'saved layout',
				data.layouts.length,
			)}.\nDo you want to merge with your existing layouts or replace them?`,
			{ modal: true },
			merge,
			replace,
			cancel,
		);
		if (result !== replace && result !== merge) return;

		const stored = (result === merge ? this.storage.getWorkspace('layouts') : undefined) ?? {
			v: 1,
			data: undefined!,
		};
		for (const layout of data.layouts) {
			stored.data = updateRecordValue<LayoutDescriptor>(stored.data, layout.id, {
				id: layout.id,
				label: layout.label,
				context: layout.context,
				tabs: layout.tabs.length,
				timestamp: layout.timestamp,
			});

			await this.storage.storeWorkspace(`layout:${layout.id}`, {
				v: 1,
				data: {
					id: layout.id,
					editorLayout: layout.editorLayout,
					tabs: layout.tabs,
				},
			});
		}

		await this.storage.storeWorkspace('layouts', stored);
		this._onDidChange.fire();
	}

	private async update(id: string, mutator: (layout: LayoutDescriptor) => void): Promise<void> {
		const stored = this.storage.getWorkspace('layouts');
		if (stored == null) return;

		const layout = stored.data[id];
		if (layout == null) return;

		mutator(layout);
		layout.timestamp = Date.now();
		await this.storage.storeWorkspace('layouts', stored);
	}

	@log()
	async rename(id: string, label: string) {
		const scope = getLogScope();

		try {
			await this.update(id, layout => (layout.label = label));

			this._onDidChange.fire();
		} catch (ex) {
			debugger;
			Logger.error(ex, scope);
		}
	}

	@log()
	async restore(id: string) {
		const scope = getLogScope();

		try {
			const layout = this.get(id);
			if (!layout?.tabs.length) return;

			// Close all opened documents
			await executeCoreCommand('workbench.action.closeAllEditors');

			// Restore the layout
			if (layout.editorLayout != null) {
				await executeCoreCommand('vscode.setEditorLayout', layout.editorLayout);
			}

			for (const tab of layout.tabs) {
				try {
					await openTab(tab, {
						selection:
							tab.selection != null
								? new Range(
										tab.selection.start.line,
										tab.selection.start.character,
										tab.selection.end.line,
										tab.selection.end.character,
								  )
								: undefined,
					});
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

	async save(label: string): Promise<void>;
	async save(descriptor: LayoutDescriptor): Promise<void>;
	@log()
	async save(labelOrDescriptor: string | LayoutDescriptor): Promise<void> {
		const scope = getLogScope();

		// Get current branch from the Git extension
		// TODO@eamodio support remote repositories
		let branch;
		try {
			const repositories = extensions.getExtension<GitExtension>('vscode.git')?.exports.getAPI(1)?.repositories;
			branch = repositories?.length === 1 ? repositories[0].state.HEAD?.name : undefined;
		} catch {}

		try {
			let descriptor: LayoutDescriptor;
			if (typeof labelOrDescriptor === 'string') {
				descriptor = {
					id: uuid(),
					label: labelOrDescriptor,
					context: undefined,
					tabs: 0,
					timestamp: undefined!,
				};
			} else {
				descriptor = labelOrDescriptor;
			}

			const data: Layout = {
				id: descriptor.id,
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
						data.tabs.push({
							...common,
							type: 'text',
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputTextDiff) {
						data.tabs.push({
							...common,
							type: 'diff',
							uri: input.modified.toString(),
							original: input.original.toString(),
						});
					} else if (input instanceof TabInputCustom) {
						data.tabs.push({
							...common,
							type: 'custom',
							id: input.viewType,
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputWebview) {
						data.tabs.push({
							...common,
							type: 'webview',
							id: input.viewType,
						});
					} else if (input instanceof TabInputNotebook) {
						data.tabs.push({
							...common,
							type: 'notebook',
							id: input.notebookType,
							uri: input.uri.toString(),
						});
					} else if (input instanceof TabInputNotebookDiff) {
						data.tabs.push({
							...common,
							type: 'notebook-diff',
							id: input.notebookType,
							uri: input.modified.toString(),
							original: input.original.toString(),
						});
					} else if (input instanceof TabInputTerminal) {
						data.tabs.push({
							...common,
							type: 'terminal',
						});
					} else {
						debugger;
					}
				}
			}

			if (configuration.get('experimental.saveTabSelection')) {
				const selectionMap = await getSelectionMap();
				for (const t of data.tabs) {
					if (t.type === 'terminal' || t.type === 'webview') continue;

					t.selection = selectionMap.get(t.uri);
				}
			}

			data.editorLayout = await executeCoreCommand('vscode.getEditorLayout');

			const stored = this.storage.getWorkspace('layouts') ?? { v: 1, data: undefined! };
			stored.data = updateRecordValue<LayoutDescriptor>(stored.data, descriptor.id, {
				...descriptor,
				context: branch,
				tabs: data.tabs.length,
				timestamp: Date.now(),
			});

			await Promise.allSettled([
				this.storage.storeWorkspace(`layout:${descriptor.id}`, { v: 1, data: data }),
				this.storage.storeWorkspace('layouts', stored),
			]);

			this._onDidChange.fire();
		} catch (ex) {
			debugger;
			Logger.error(ex, scope);
		}
	}
}

async function getSelectionMap(): Promise<Map<string, StoredTabSelection>> {
	const map = new Map<string, StoredTabSelection>();
	updateSelectionMap(map);

	const groups = window.tabGroups;
	let editors = flatCount(groups.all, g => g.tabs.length);
	if (editors <= 1 || editors === map.size) return map;

	const deferred = defer<Map<string, StoredTabSelection>>();
	const disposables: Disposable[] = [];

	function next() {
		if (!deferred.pending) return;

		editors--;
		if (editors <= 0) {
			deferred.fulfill(map);
			disposables.forEach(d => void d.dispose());
		}
		void executeCoreCommand('workbench.action.nextEditor');
	}

	function deferNext() {
		if (!deferred.pending) return;
		setTimeout(() => {
			if (!deferred.pending) return;

			updateSelectionMap(map);
			next();
		}, 100);
	}

	disposables.push(groups.onDidChangeTabGroups(deferNext), groups.onDidChangeTabs(deferNext));

	next();

	return deferred.promise;
}

function updateSelectionMap(map: Map<string, StoredTabSelection>) {
	for (const e of [window.activeTextEditor, ...window.visibleTextEditors]) {
		if (e == null) continue;

		map.set(e.document.uri.toString(), {
			start: {
				line: e.selection.start.line,
				character: e.selection.start.character,
			},
			end: {
				line: e.selection.end.line,
				character: e.selection.end.character,
			},
		});
	}

	for (const e of [window.activeNotebookEditor, ...window.visibleNotebookEditors]) {
		if (e == null) continue;

		map.set(e.notebook.uri.toString(), {
			start: {
				line: e.selection.start,
				character: 0,
			},
			end: {
				line: e.selection.end,
				character: 0,
			},
		});
	}
}
