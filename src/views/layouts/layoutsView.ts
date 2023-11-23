import type { Disposable } from 'vscode';
import { TreeItem, TreeItemCollapsibleState, ViewColumn } from 'vscode';
import type { Container } from '../../container';
import { executeCommand, registerViewCommand } from '../../system/command';
import { pluralize } from '../../system/string';
import { openTab } from '../../system/utils';
import { ViewBase } from '../viewBase';
import { ViewNode } from '../viewNode';
import { LayoutNode } from './layoutNode';

export class LayoutsViewNode extends ViewNode<'layouts'> {
	constructor(view: LayoutsView) {
		super('layouts', view);
	}

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

export class LayoutsView extends ViewBase<'layouts', LayoutsViewNode> {
	constructor(container: Container) {
		super(container, 'layouts', 'Layouts');

		this.disposables.push(container.layoutManager.onDidChange(() => this.refresh(true)));
	}

	protected getRoot() {
		return new LayoutsViewNode(this);
	}

	protected registerCommands(): Disposable[] {
		return [
			registerViewCommand(this.id, 'refresh', () => this.refresh(true)),
			registerViewCommand(this.id, 'export', () => executeCommand('restoreEditors.export')),
			registerViewCommand(this.id, 'import', () => executeCommand('restoreEditors.import')),
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
