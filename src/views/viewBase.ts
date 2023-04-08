import type {
	CancellationToken,
	ConfigurationChangeEvent,
	Disposable,
	Event,
	TreeDataProvider,
	TreeItem,
	TreeView,
	TreeViewExpansionEvent,
	TreeViewSelectionChangeEvent,
	TreeViewVisibilityChangeEvent,
} from 'vscode';
import { EventEmitter, MarkdownString, TreeItemCollapsibleState, window } from 'vscode';
import type { ViewIds } from '../constants';
import type { Container } from '../container';
import { executeCommand } from '../system/command';
import { configuration } from '../system/configuration';
import { debug, log } from '../system/decorators/log';
import { debounce } from '../system/function';
import { Logger } from '../system/logger';
import { getLogScope } from '../system/logger.scope';
import { isPromise } from '../system/promise';
import type { ViewNode } from './viewNode';

export interface TreeViewNodeCollapsibleStateChangeEvent<T> extends TreeViewExpansionEvent<T> {
	state: TreeItemCollapsibleState;
}

export abstract class ViewBase<RootNode extends ViewNode> implements TreeDataProvider<ViewNode>, Disposable {
	protected _onDidChangeTreeData = new EventEmitter<ViewNode | undefined>();
	get onDidChangeTreeData(): Event<ViewNode | undefined> {
		return this._onDidChangeTreeData.event;
	}

	private _onDidChangeSelection = new EventEmitter<TreeViewSelectionChangeEvent<ViewNode>>();
	get onDidChangeSelection(): Event<TreeViewSelectionChangeEvent<ViewNode>> {
		return this._onDidChangeSelection.event;
	}

	private _onDidChangeVisibility = new EventEmitter<TreeViewVisibilityChangeEvent>();
	get onDidChangeVisibility(): Event<TreeViewVisibilityChangeEvent> {
		return this._onDidChangeVisibility.event;
	}

	private _onDidChangeNodeCollapsibleState = new EventEmitter<TreeViewNodeCollapsibleStateChangeEvent<ViewNode>>();
	get onDidChangeNodeCollapsibleState(): Event<TreeViewNodeCollapsibleStateChangeEvent<ViewNode>> {
		return this._onDidChangeNodeCollapsibleState.event;
	}

	protected disposables: Disposable[] = [];
	protected root: RootNode | undefined;
	protected tree: TreeView<ViewNode> | undefined;

	constructor(public readonly container: Container, public readonly id: ViewIds, public readonly name: string) {
		if (this.container.debugging) {
			function addDebuggingInfo(item: TreeItem, node: ViewNode, parent: ViewNode | undefined) {
				if (item.tooltip == null) {
					item.tooltip = new MarkdownString(
						item.label != null && typeof item.label !== 'string' ? item.label.label : item.label ?? '',
					);
				}

				if (typeof item.tooltip === 'string') {
					item.tooltip = `${item.tooltip}\n\n---\ncontext: ${item.contextValue}\nnode: ${node.toString()}${
						parent != null ? `\nparent: ${parent.toString()}` : ''
					}`;
				} else {
					item.tooltip.appendMarkdown(
						`\n\n---\n\ncontext: \`${item.contextValue}\`\\\nnode: \`${node.toString()}\`${
							parent != null ? `\\\nparent: \`${parent.toString()}\`` : ''
						}`,
					);
				}
			}

			const getTreeItemFn = this.getTreeItem;
			this.getTreeItem = async function (this: ViewBase<RootNode>, node: ViewNode) {
				const item = await getTreeItemFn.apply(this, [node]);

				if (node.resolveTreeItem == null) {
					addDebuggingInfo(item, node, node.getParent());
				}

				return item;
			};

			const resolveTreeItemFn = this.resolveTreeItem;
			this.resolveTreeItem = async function (this: ViewBase<RootNode>, item: TreeItem, node: ViewNode) {
				item = await resolveTreeItemFn.apply(this, [item, node]);

				addDebuggingInfo(item, node, node.getParent());

				return item;
			};
		}

		this.disposables.push(...this.registerCommands());

		this.initialize({ canSelectMany: this.canSelectMany, showCollapseAll: this.showCollapseAll });
		queueMicrotask(() => this.onConfigurationChanged());
	}

	dispose() {
		this.disposables.forEach(d => void d.dispose());
	}

	get canReveal(): boolean {
		return true;
	}

	get canSelectMany(): boolean {
		return false;
	}

	protected get showCollapseAll(): boolean {
		return true;
	}

	protected filterConfigurationChanged(_e: ConfigurationChangeEvent) {
		// if (!configuration.changed(e, 'views')) return false;
		return false;
	}

	private _title: string | undefined;
	get title(): string | undefined {
		return this._title;
	}
	set title(value: string | undefined) {
		this._title = value;
		if (this.tree != null) {
			this.tree.title = value;
		}
	}

	private _description: string | undefined;
	get description(): string | undefined {
		return this._description;
	}
	set description(value: string | undefined) {
		this._description = value;
		if (this.tree != null) {
			this.tree.description = value;
		}
	}

	private _message: string | undefined;
	get message(): string | undefined {
		return this._message;
	}
	set message(value: string | undefined) {
		this._message = value;
		if (this.tree != null) {
			this.tree.message = value;
		}
	}

	getQualifiedCommand(command: string) {
		return `${this.id}.${command}`;
	}

	protected abstract getRoot(): RootNode;
	protected abstract registerCommands(): Disposable[];
	protected onConfigurationChanged(e?: ConfigurationChangeEvent): void {
		if (e != null && this.root != null) {
			void this.refresh(true);
		}
	}

	protected initialize(options: { canSelectMany?: boolean; showCollapseAll?: boolean } = {}) {
		this.tree = window.createTreeView<ViewNode>(this.id, {
			...options,
			treeDataProvider: this,
		});
		this.disposables.push(
			configuration.onDidChange(e => {
				if (!this.filterConfigurationChanged(e)) return;

				this.onConfigurationChanged(e);
			}, this),
			this.tree,
			this.tree.onDidChangeSelection(debounce(this.onSelectionChanged, 250), this),
			this.tree.onDidChangeVisibility(debounce(this.onVisibilityChanged, 250), this),
			this.tree.onDidCollapseElement(this.onElementCollapsed, this),
			this.tree.onDidExpandElement(this.onElementExpanded, this),
		);
		this._title = this.tree.title;
	}

	protected ensureRoot(force: boolean = false) {
		if (this.root == null || force) {
			this.root = this.getRoot();
		}

		return this.root;
	}

	getChildren(node?: ViewNode): ViewNode[] | Promise<ViewNode[]> {
		if (node != null) return node.getChildren();

		const root = this.ensureRoot();
		return root.getChildren();
	}

	getParent(node: ViewNode): ViewNode | undefined {
		return node.getParent();
	}

	getTreeItem(node: ViewNode): TreeItem | Promise<TreeItem> {
		return node.getTreeItem();
	}

	resolveTreeItem(item: TreeItem, node: ViewNode): TreeItem | Promise<TreeItem> {
		return node.resolveTreeItem?.(item) ?? item;
	}

	protected onElementCollapsed(e: TreeViewExpansionEvent<ViewNode>) {
		this._onDidChangeNodeCollapsibleState.fire({ ...e, state: TreeItemCollapsibleState.Collapsed });
	}

	protected onElementExpanded(e: TreeViewExpansionEvent<ViewNode>) {
		this._onDidChangeNodeCollapsibleState.fire({ ...e, state: TreeItemCollapsibleState.Expanded });
	}

	protected onSelectionChanged(e: TreeViewSelectionChangeEvent<ViewNode>) {
		this._onDidChangeSelection.fire(e);
	}

	protected onVisibilityChanged(e: TreeViewVisibilityChangeEvent) {
		this._onDidChangeVisibility.fire(e);
	}

	get activeSelection(): ViewNode | undefined {
		if (this.tree == null || this.root == null) return undefined;

		// TODO@eamodio: https://github.com/microsoft/vscode/issues/157406
		return this.tree.selection[0];
	}

	get selection(): readonly ViewNode[] {
		if (this.tree == null || this.root == null) return [];

		return this.tree.selection;
	}

	get visible(): boolean {
		return this.tree?.visible ?? false;
	}

	async findNode(
		id: string,
		options?: {
			canTraverse?: (node: ViewNode) => boolean | Promise<boolean>;
			maxDepth?: number;
			token?: CancellationToken;
		},
	): Promise<ViewNode | undefined>;
	async findNode(
		predicate: (node: ViewNode) => boolean,
		options?: {
			canTraverse?: (node: ViewNode) => boolean | Promise<boolean>;
			maxDepth?: number;
			token?: CancellationToken;
		},
	): Promise<ViewNode | undefined>;
	@log<ViewBase<RootNode>['findNode']>({
		args: {
			0: predicate => (typeof predicate === 'string' ? predicate : '<function>'),
			1: opts => JSON.stringify(opts),
		},
	})
	async findNode(
		predicate: string | ((node: ViewNode) => boolean),
		options?: {
			canTraverse?: (node: ViewNode) => boolean | Promise<boolean>;
			maxDepth?: number;
			token?: CancellationToken;
		},
	): Promise<ViewNode | undefined> {
		const scope = getLogScope();

		async function find(this: ViewBase<RootNode>) {
			try {
				const node = await findNodeCoreBFS(
					typeof predicate === 'string' ? n => n.id === predicate : predicate,
					this.ensureRoot(),
					options?.canTraverse,
					options?.maxDepth ?? 2,
					options?.token,
				);

				return node;
			} catch (ex) {
				Logger.error(ex, scope);
				return undefined;
			}
		}

		if (this.root != null) return find.call(this);

		// If we have no root (e.g. never been initialized) force it so the tree will load properly
		await this.show({ preserveFocus: true });
		// Since we have to show the view, give the view time to load and let the callstack unwind before we try to find the node
		return new Promise<ViewNode | undefined>(resolve => setTimeout(() => resolve(find.call(this)), 100));
	}

	protected async ensureRevealNode(
		node: ViewNode,
		options?: {
			select?: boolean;
			focus?: boolean;
			expand?: boolean | number;
		},
	) {
		// Not sure why I need to reveal each parent, but without it the node won't be revealed
		const nodes: ViewNode[] = [];

		let parent: ViewNode | undefined = node;
		while (parent != null) {
			nodes.push(parent);
			parent = parent.getParent();
		}

		if (nodes.length > 1) {
			nodes.pop();
		}

		for (const n of nodes.reverse()) {
			try {
				await this.reveal(n, options);
			} catch {}
		}
	}

	@debug()
	async refresh(reset: boolean = false) {
		await this.root?.refresh?.(reset);

		this.triggerNodeChange();
	}

	@debug<ViewBase<RootNode>['refreshNode']>({ args: { 0: n => n.toString() } })
	async refreshNode(node: ViewNode, reset: boolean = false, force: boolean = false) {
		const cancel = await node.refresh?.(reset);
		if (!force && cancel === true) return;

		this.triggerNodeChange(node);
	}

	@log<ViewBase<RootNode>['reveal']>({ args: { 0: n => n.toString() } })
	async reveal(
		node: ViewNode,
		options?: {
			select?: boolean;
			focus?: boolean;
			expand?: boolean | number;
		},
	) {
		if (this.tree == null) return;

		try {
			await this.tree.reveal(node, options);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@log()
	async show(options?: { preserveFocus?: boolean }) {
		const scope = getLogScope();

		try {
			void (await executeCommand(`${this.id}.focus`, options));
		} catch (ex) {
			Logger.error(ex, scope);
		}
	}

	@debug<ViewBase<RootNode>['triggerNodeChange']>({ args: { 0: n => n?.toString() } })
	triggerNodeChange(node?: ViewNode) {
		// Since the root node won't actually refresh, force everything
		this._onDidChangeTreeData.fire(node != null && node !== this.root ? node : undefined);
	}
}

async function findNodeCoreBFS(
	predicate: (node: ViewNode) => boolean,
	root: ViewNode,
	canTraverse: ((node: ViewNode) => boolean | Promise<boolean>) | undefined,
	maxDepth: number,
	token: CancellationToken | undefined,
): Promise<ViewNode | undefined> {
	const queue: (ViewNode | undefined)[] = [root, undefined];

	let depth = 0;
	let node: ViewNode | undefined;
	let children: ViewNode[];
	while (queue.length > 1) {
		if (token?.isCancellationRequested) return undefined;

		node = queue.shift();
		if (node == null) {
			depth++;

			queue.push(undefined);
			if (depth > maxDepth) break;

			continue;
		}

		if (predicate(node)) return node;
		if (canTraverse != null) {
			const traversable = canTraverse(node);
			if (isPromise(traversable)) {
				if (!(await traversable)) continue;
			} else if (!traversable) {
				continue;
			}
		}

		children = await node.getChildren();
		if (children.length === 0) continue;

		while (node != null) {
			node = await node.getSplattedChild?.();
		}

		queue.push(...children);
	}

	return undefined;
}
