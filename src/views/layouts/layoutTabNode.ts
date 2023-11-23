import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, workspace } from 'vscode';
import type { LayoutDescriptor, StoredTab } from '../../constants';
import { ViewItemContextValues } from '../../constants';
import { createViewCommand } from '../../system/command';
import { getBestPath, normalizePath, relativeDir } from '../../system/path';
import { ViewNode } from '../viewNode';
import type { LayoutsView } from './layoutsView';

export class LayoutTabNode extends ViewNode<'tab'> {
	constructor(
		view: LayoutsView,
		parent: ViewNode,
		public readonly layout: LayoutDescriptor,
		public readonly tab: StoredTab,
	) {
		super('tab', view, parent);
	}

	getChildren(): ViewNode[] {
		return [];
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem(this.tab.label, TreeItemCollapsibleState.None);
		item.contextValue = ViewItemContextValues.LayoutTab;
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
