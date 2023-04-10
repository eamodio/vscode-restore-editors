import type { Disposable } from 'vscode';
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, ViewColumn, workspace } from 'vscode';
import type { LayoutDescriptor, StoredTab } from '../constants';
import { ContextValues } from '../constants';
import type { Container } from '../container';
import { createViewCommand, executeCommand, registerViewCommand } from '../system/command';
import { fromNow } from '../system/date';
import { getBestPath, normalizePath, relativeDir } from '../system/path';
import { pluralize } from '../system/string';
import { openTab } from '../system/utils';
import { ViewBase } from './viewBase';
import { ViewNode } from './viewNode';

export class LayoutTabNode extends ViewNode {
	constructor(
		view: LayoutsView,
		parent: ViewNode,
		public readonly layout: LayoutDescriptor,
		public readonly tab: StoredTab,
	) {
		super(view, parent);
	}

	getChildren(): ViewNode[] {
		return [];
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem(this.tab.label, TreeItemCollapsibleState.None);
		item.contextValue = ContextValues.LayoutTab;
		switch (this.tab.type) {
			case 'text':
			case 'custom':
			case 'diff':
			case 'notebook':
			case 'notebook-diff': {
				const uri = Uri.parse(this.tab.uri);
				let path = getBestPath(uri);
				let workspaceUri = workspace.getWorkspaceFolder(uri)?.uri;
				if (workspaceUri == null) {
					const fsUri = Uri.file(path);
					workspaceUri = workspace.getWorkspaceFolder(fsUri)?.uri;
					if (workspaceUri != null) {
						path = getBestPath(fsUri);
					}
				}
				const workspacePath = workspaceUri != null ? getBestPath(workspaceUri) : undefined;

				item.command = createViewCommand(this.view.id, 'tab.preview', this);
				item.description = normalizePath(relativeDir(path, workspacePath));
				item.resourceUri = uri;

				break;
			}
			case 'terminal':
				item.command = createViewCommand(this.view.id, 'tab.preview', this);
				item.iconPath = new ThemeIcon('terminal');
				break;
			case 'webview':
				item.iconPath = new ThemeIcon('browser');
				break;
		}

		return item;
	}
}

export class LayoutNode extends ViewNode {
	constructor(view: LayoutsView, parent: ViewNode, public readonly layout: LayoutDescriptor) {
		super(view, parent);
	}

	override get id(): string {
		return this.layout.id;
	}

	getChildren(): ViewNode[] {
		const layout = this.view.container.layoutManager.get(this.layout.id);
		const tabs = layout?.tabs;
		if (!tabs?.length) return [];

		return tabs.map(t => new LayoutTabNode(this.view, this, this.layout, t));
	}

	getTreeItem(): TreeItem {
		const { layout } = this;

		const item = new TreeItem(layout.label, TreeItemCollapsibleState.Collapsed);
		item.contextValue = ContextValues.Layout;
		item.description = `${pluralize('tab', layout.tabs)}${
			layout.context ? ` on ${layout.context}` : ''
		} \u00a0\u2022\u00a0 ${fromNow(layout.timestamp)}`;
		// item.iconPath = new ThemeIcon('editor-layout');
		item.id = layout.id;
		return item;
	}
}

export class LayoutsViewNode extends ViewNode {
	getChildren(): ViewNode[] {
		const layouts = this.view.container.layoutManager.getLayouts();
		if (!layouts.length) {
			this.view.description = undefined;
			return [];
		}

		this.view.description = pluralize('layout', layouts.length);

		return layouts.sort((a, b) => b.timestamp - a.timestamp).map(l => new LayoutNode(this.view, this, l));
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem('Layouts', TreeItemCollapsibleState.Expanded);
		return item;
	}
}

export class LayoutsView extends ViewBase<LayoutsViewNode> {
	constructor(container: Container) {
		super(container, 'restoreEditors.views.layouts', 'Layouts');

		this.disposables.push(container.layoutManager.onDidChange(() => this.refresh(true)));
	}

	protected getRoot() {
		return new LayoutsViewNode(this);
	}

	protected registerCommands(): Disposable[] {
		return [
			registerViewCommand(this.id, 'refresh', () => this.refresh(true)),
			registerViewCommand(this.id, 'save', () => executeCommand('restoreEditors.save')),
			registerViewCommand(this.id, 'layout.delete', n => executeCommand('restoreEditors.delete', n.layout.id)),
			registerViewCommand(this.id, 'layout.replace', n => executeCommand('restoreEditors.replace', n.layout.id)),
			registerViewCommand(this.id, 'layout.rename', n => executeCommand('restoreEditors.rename', n.layout.id)),
			registerViewCommand(this.id, 'layout.restore', n => executeCommand('restoreEditors.restore', n.layout.id)),
			registerViewCommand(this.id, 'tab.delete', n => this.container.layoutManager.deleteTab(n.layout.id, n.tab)),
			registerViewCommand(this.id, 'tab.preview', n =>
				openTab(n.tab, { preserveFocus: true, preview: true, viewColumn: ViewColumn.Active }),
			),
			registerViewCommand(this.id, 'tab.restore', n => openTab(n.tab)),
		];
	}
}
