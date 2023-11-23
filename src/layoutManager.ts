import type { Disposable, Event } from 'vscode';
import {
	EventEmitter,
	extensions,
	TabInputCustom,
	TabInputNotebook,
	TabInputNotebookDiff,
	TabInputTerminal,
	TabInputText,
	TabInputTextDiff,
	TabInputWebview,
	window,
} from 'vscode';
import { uuid } from '@env/crypto';
import type { GitExtension } from './@types/vscode.git';
import type { Layout, LayoutDescriptor, Layouts, StoredTab, StoredTabCommon } from './constants';
import type { Container } from './container';
import { executeCoreCommand } from './system/command';
import { debug, log } from './system/decorators/log';
import { Logger } from './system/logger';
import { getLogScope } from './system/logger.scope';
import { updateRecordValue } from './system/object';
import type { Storage } from './system/storage';
import { openTab } from './system/utils';

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
