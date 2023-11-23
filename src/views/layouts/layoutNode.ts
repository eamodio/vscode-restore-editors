import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { LayoutDescriptor } from '../../constants';
import { ViewItemContextValues } from '../../constants';
import { fromNow } from '../../system/date';
import { pluralize } from '../../system/string';
import { getViewNodeId, ViewNode } from '../viewNode';
import type { LayoutsView } from './layoutsView';
import { LayoutTabNode } from './layoutTabNode';

export class LayoutNode extends ViewNode<'layout'> {
	constructor(
		view: LayoutsView,
		parent: ViewNode,
		public readonly layout: LayoutDescriptor,
	) {
		super('layout', view, parent);
		this._uniqueId = getViewNodeId(this.type, { layoutId: this.layout.id });
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
		item.contextValue = ViewItemContextValues.Layout;
		item.description = `${pluralize('tab', layout.tabs)}${
			layout.context ? ` on ${layout.context}` : ''
		} \u00a0\u2022\u00a0 ${fromNow(layout.timestamp)}`;
		// item.iconPath = new ThemeIcon('editor-layout');
		item.id = this.id;
		return item;
	}
}
