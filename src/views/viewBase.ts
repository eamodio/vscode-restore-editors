import type {
	CancellationToken,
	ConfigurationChangeEvent,
	Event,
	TreeCheckboxChangeEvent,
	TreeDataProvider,
	TreeItem,
	TreeView,
	TreeViewExpansionEvent,
	TreeViewSelectionChangeEvent,
	TreeViewVisibilityChangeEvent,
	ViewBadge,
} from 'vscode';
import { Disposable, EventEmitter, MarkdownString, TreeItemCollapsibleState, window } from 'vscode';
import type { TreeViewCommandSuffixesByViewType, TreeViewIds, TreeViewTypes } from '../constants';
import type { Container } from '../container';
import { executeCoreCommand } from '../system/command';
import { configuration } from '../system/configuration';
import { debug, log } from '../system/decorators/log';
import { debounce, once } from '../system/function';
import { Logger } from '../system/logger';
import { getLogScope } from '../system/logger.scope';
import { isPromise } from '../system/promise';
import type { ViewNode } from './viewNode';

export interface TreeViewNodeCollapsibleStateChangeEvent<T> extends TreeViewExpansionEvent<T> {
	state: TreeItemCollapsibleState;
}

export abstract class ViewBase<Type extends TreeViewTypes, RootNode extends ViewNode>
	implements TreeDataProvider<ViewNode>, Disposable
{
	get id(): TreeViewIds<Type> {
		return `restoreEditors.views.${this.type}`;
	}

	protected _onDidInitialize = new EventEmitter<void>();
	private initialized = false;

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

	private _onDidChangeNodesCheckedState = new EventEmitter<TreeCheckboxChangeEvent<ViewNode>>();
	get onDidChangeNodesCheckedState(): Event<TreeCheckboxChangeEvent<ViewNode>> {
		return this._onDidChangeNodesCheckedState.event;
	}

	protected disposables: Disposable[] = [];
	protected root: RootNode | undefined;
	protected tree: TreeView<ViewNode> | undefined;

	constructor(
		public readonly container: Container,
		public readonly type: Type,
		public readonly name: string,
	) {
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
			this.getTreeItem = async function (this: ViewBase<Type, RootNode>, node: ViewNode) {
				const item = await getTreeItemFn.apply(this, [node]);

				if (node.resolveTreeItem == null) {
					addDebuggingInfo(item, node, node.getParent());
				}

				return item;
			};

			const resolveTreeItemFn = this.resolveTreeItem;
			this.resolveTreeItem = async function (this: ViewBase<Type, RootNode>, item: TreeItem, node: ViewNode) {
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
		this._nodeState?.dispose();
		this._nodeState = undefined;
		Disposable.from(...this.disposables).dispose();
	}

	get canReveal(): boolean {
		return true;
	}

	get canSelectMany(): boolean {
		return false;
	}

	private _nodeState: ViewNodeState | undefined;
	get nodeState(): ViewNodeState {
		if (this._nodeState == null) {
			this._nodeState = new ViewNodeState();
		}

		return this._nodeState;
	}

	protected get showCollapseAll(): boolean {
		return true;
	}

	protected filterConfigurationChanged(_e: ConfigurationChangeEvent) {
		// if (!configuration.changed(e, 'views')) return false;
		return false;
	}

	get badge(): ViewBadge | undefined {
		return this.tree?.badge;
	}
	set badge(value: ViewBadge | undefined) {
		if (this.tree != null) {
			this.tree.badge = value;
		}
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

	getQualifiedCommand(command: TreeViewCommandSuffixesByViewType<Type>) {
		return `restoreEditors.views.${this.type}.${command}` as const;
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
			this.tree.onDidChangeCheckboxState(this.onCheckboxStateChanged, this),
			this.tree.onDidCollapseElement(this.onElementCollapsed, this),
			this.tree.onDidExpandElement(this.onElementExpanded, this),
		);

		if (this._title != null) {
			this.tree.title = this._title;
		} else {
			this._title = this.tree.title;
		}
		if (this._description != null) {
			this.tree.description = this._description;
		}
		if (this._message != null) {
			this.tree.message = this._message;
		}
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
		const children = root.getChildren();
		if (!this.initialized) {
			if (isPromise(children)) {
				void children.then(() => {
					if (!this.initialized) {
						this.initialized = true;
						setTimeout(() => this._onDidInitialize.fire(), 1);
					}
				});
			} else {
				this.initialized = true;
				setTimeout(() => this._onDidInitialize.fire(), 1);
			}
		}

		return children;
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

	protected onCheckboxStateChanged(e: TreeCheckboxChangeEvent<ViewNode>) {
		try {
			for (const [node, state] of e.items) {
				if (node.id == null) {
					debugger;
					throw new Error('Id is required for checkboxes');
				}

				node.storeState('checked', state, true);
			}
		} finally {
			this._onDidChangeNodesCheckedState.fire(e);
		}
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

	@log<ViewBase<Type, RootNode>['findNode']>({
		args: {
			0: '<function>',
			1: opts => `options=${JSON.stringify({ ...opts, canTraverse: undefined, token: undefined })}`,
		},
	})
	async findNode(
		predicate: (node: ViewNode) => boolean,
		options?: {
			canTraverse?: (node: ViewNode) => boolean | Promise<boolean>;
			maxDepth?: number;
			token?: CancellationToken;
		},
	): Promise<ViewNode | undefined> {
		const scope = getLogScope();

		async function find(this: ViewBase<Type, RootNode>) {
			try {
				const node = await findNodeCoreBFS(
					predicate,
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

		if (this.initialized) return find.call(this);

		// If we have no root (e.g. never been initialized) force it so the tree will load properly
		void this.show({ preserveFocus: true });
		// Since we have to show the view, give the view time to load and let the callstack unwind before we try to find the node
		return new Promise<ViewNode | undefined>(resolve =>
			once(this._onDidInitialize.event)(() => resolve(find.call(this)), this),
		);
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
		// If we are resetting, make sure to clear any saved node state
		if (reset) {
			this.nodeState.reset();
		}

		await this.root?.refresh?.(reset);

		this.triggerNodeChange();
	}

	@debug<ViewBase<Type, RootNode>['refreshNode']>({ args: { 0: n => n.toString() } })
	async refreshNode(node: ViewNode, reset: boolean = false, force: boolean = false) {
		const cancel = await node.refresh?.(reset);
		if (!force && cancel === true) return;

		this.triggerNodeChange(node);
	}

	@log<ViewBase<Type, RootNode>['reveal']>({ args: { 0: n => n.toString() } })
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
			void (await executeCoreCommand(`${this.id}.focus`, options));
		} catch (ex) {
			Logger.error(ex, scope);
		}
	}

	@debug<ViewBase<Type, RootNode>['triggerNodeChange']>({ args: { 0: n => n?.toString() } })
	triggerNodeChange(node?: ViewNode) {
		// Since the root node won't actually refresh, force everything
		this._onDidChangeTreeData.fire(node != null && node !== this.root ? node : undefined);
	}

	// NOTE: @eamodio uncomment to track node leaks
	// private _nodeTracking = new Map<string, string | undefined>();
	// private registry = new FinalizationRegistry<string>(uuid => {
	// 	const id = this._nodeTracking.get(uuid);

	// 	Logger.log(`@@@ ${this.type} Finalizing [${uuid}]:${id}`);

	// 	this._nodeTracking.delete(uuid);

	// 	if (id != null) {
	// 		const c = count(this._nodeTracking.values(), v => v === id);
	// 		Logger.log(`@@@ ${this.type} [${padLeft(String(c), 3)}] ${id}`);
	// 	}
	// });

	// registerNode(node: ViewNode) {
	// 	const uuid = node.uuid;

	// 	Logger.log(`@@@ ${this.type}.registerNode [${uuid}]:${node.id}`);

	// 	this._nodeTracking.set(uuid, node.id);
	// 	this.registry.register(node, uuid);
	// }

	// unregisterNode(node: ViewNode) {
	// 	const uuid = node.uuid;

	// 	Logger.log(`@@@ ${this.type}.unregisterNode [${uuid}]:${node.id}`);

	// 	this._nodeTracking.delete(uuid);
	// 	this.registry.unregister(node);
	// }

	// private _timer = setInterval(() => {
	// 	const counts = new Map<string | undefined, number>();
	// 	for (const value of this._nodeTracking.values()) {
	// 		const count = counts.get(value) ?? 0;
	// 		counts.set(value, count + 1);
	// 	}

	// 	let total = 0;
	// 	for (const [id, count] of counts) {
	// 		if (count > 1) {
	// 			Logger.log(`@@@ ${this.type} [${padLeft(String(count), 3)}] ${id}`);
	// 		}
	// 		total += count;
	// 	}

	// 	Logger.log(`@@@ ${this.type} total=${total}`);
	// }, 10000);
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

export class ViewNodeState implements Disposable {
	private _store: Map<string, Map<string, unknown>> | undefined;
	private _stickyStore: Map<string, Map<string, unknown>> | undefined;

	dispose() {
		this.reset();

		this._stickyStore?.clear();
		this._stickyStore = undefined;
	}

	reset() {
		this._store?.clear();
		this._store = undefined;
	}

	delete(prefix: string, key: string): void {
		for (const store of [this._store, this._stickyStore]) {
			if (store == null) continue;

			for (const [id, map] of store) {
				if (id.startsWith(prefix)) {
					map.delete(key);
					if (map.size === 0) {
						store.delete(id);
					}
				}
			}
		}
	}

	deleteState(id: string, key?: string): void {
		if (key == null) {
			this._store?.delete(id);
			this._stickyStore?.delete(id);
		} else {
			for (const store of [this._store, this._stickyStore]) {
				if (store == null) continue;

				const map = store.get(id);
				if (map == null) continue;

				map.delete(key);
				if (map.size === 0) {
					store.delete(id);
				}
			}
		}
	}

	get<T>(prefix: string, key: string): Map<string, T> {
		const maps = new Map<string, T>();

		for (const store of [this._store, this._stickyStore]) {
			if (store == null) continue;

			for (const [id, map] of store) {
				if (id.startsWith(prefix) && map.has(key)) {
					maps.set(id, map.get(key) as T);
				}
			}
		}

		return maps;
	}

	getState<T>(id: string, key: string): T | undefined {
		return (this._stickyStore?.get(id)?.get(key) ?? this._store?.get(id)?.get(key)) as T | undefined;
	}

	storeState<T>(id: string, key: string, value: T, sticky?: boolean): void {
		let store;
		if (sticky) {
			if (this._stickyStore == null) {
				this._stickyStore = new Map();
			}
			store = this._stickyStore;
		} else {
			if (this._store == null) {
				this._store = new Map();
			}
			store = this._store;
		}

		const state = store.get(id);
		if (state != null) {
			state.set(key, value);
		} else {
			store.set(id, new Map([[key, value]]));
		}
	}
}

export function disposeChildren(oldChildren: ViewNode[] | undefined, newChildren?: ViewNode[]) {
	if (!oldChildren?.length) return;

	for (const child of oldChildren) {
		if (newChildren?.includes(child)) continue;

		child.dispose();
	}
}
