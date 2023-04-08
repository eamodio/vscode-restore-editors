import type { Command, TreeItem, TreeItemCollapsibleState, TreeViewVisibilityChangeEvent, Uri } from 'vscode';
import { Disposable } from 'vscode';
import type { View } from '../constants';
import { gate } from '../system/decorators/gate';
import { debug, logName } from '../system/decorators/log';
import { is as isA } from '../system/function';
import { getLoggableName } from '../system/logger';
import type { TreeViewNodeCollapsibleStateChangeEvent } from './viewBase';
import { canAutoRefreshView } from './viewBase';

@logName<ViewNode>((c, name) => `${name}${c.id != null ? `(${c.id})` : ''}`)
export abstract class ViewNode<TView extends View = View, State extends object = any> {
	protected splatted = false;

	constructor(public readonly view: TView, protected parent?: ViewNode) {}

	get id(): string | undefined {
		return undefined;
	}

	toClipboard?(): string;

	toString(): string {
		const id = this.id;
		return `${getLoggableName(this)}${id != null ? `(${id})` : ''}`;
	}

	abstract getChildren(): ViewNode[] | Promise<ViewNode[]>;

	getParent(): ViewNode | undefined {
		// If this node's parent has been splatted (e.g. not shown itself, but its children are), then return its grandparent
		return this.parent?.splatted ? this.parent?.getParent() : this.parent;
	}

	abstract getTreeItem(): TreeItem | Promise<TreeItem>;

	resolveTreeItem?(item: TreeItem): TreeItem | Promise<TreeItem>;

	getCommand(): Command | undefined {
		return undefined;
	}

	refresh?(reset?: boolean): boolean | void | Promise<void> | Promise<boolean>;

	@gate<ViewNode['triggerChange']>((reset: boolean = false, force: boolean = false, avoidSelf?: ViewNode) =>
		JSON.stringify([reset, force, avoidSelf?.toString()]),
	)
	@debug()
	triggerChange(reset: boolean = false, force: boolean = false, avoidSelf?: ViewNode): Promise<void> {
		// If this node has been splatted (e.g. not shown itself, but its children are), then delegate the change to its parent
		if (this.splatted && this.parent != null && this.parent !== avoidSelf) {
			return this.parent.triggerChange(reset, force);
		}

		return this.view.refreshNode(this, reset, force);
	}

	getSplattedChild?(): Promise<ViewNode | undefined>;

	deleteState<T extends StateKey<State> = StateKey<State>>(key?: T): void {
		if (this.id == null) {
			debugger;
			throw new Error('Id is required to delete state');
		}
		return this.view.nodeState.deleteState(this.id, key as string);
	}

	getState<T extends StateKey<State> = StateKey<State>>(key: T): StateValue<State, T> | undefined {
		if (this.id == null) {
			debugger;
			throw new Error('Id is required to get state');
		}
		return this.view.nodeState.getState(this.id, key as string);
	}

	storeState<T extends StateKey<State> = StateKey<State>>(key: T, value: StateValue<State, T>): void {
		if (this.id == null) {
			debugger;
			throw new Error('Id is required to store state');
		}
		this.view.nodeState.storeState(this.id, key as string, value);
	}
}

export function isViewNode(node: any): node is ViewNode {
	return node instanceof ViewNode;
}

type StateKey<T> = keyof T;
type StateValue<T, P extends StateKey<T>> = P extends keyof T ? T[P] : never;

export abstract class ViewFileNode<TView extends View = View, State extends object = any> extends ViewNode<
	TView,
	State
> {
	constructor(view: TView, public override parent: ViewNode, public readonly uri: Uri) {
		super(view, parent);
	}

	override toString(): string {
		return `${super.toString()}:${this.uri.path}`;
	}
}

export abstract class SubscribeableViewNode<TView extends View = View> extends ViewNode<TView> {
	protected disposable: Disposable;
	protected subscription: Promise<Disposable | undefined> | undefined;

	protected loaded: boolean = false;

	constructor(view: TView, parent?: ViewNode) {
		super(view, parent);

		const disposables = [
			this.view.onDidChangeVisibility(this.onVisibilityChanged, this),
			this.view.onDidChangeNodeCollapsibleState(this.onNodeCollapsibleStateChanged, this),
		];

		if (canAutoRefreshView(this.view)) {
			disposables.push(this.view.onDidChangeAutoRefresh(this.onAutoRefreshChanged, this));
		}

		const getTreeItem = this.getTreeItem;
		this.getTreeItem = function (this: SubscribeableViewNode<TView>) {
			this.loaded = true;
			void this.ensureSubscription();
			return getTreeItem.apply(this);
		};

		const getChildren = this.getChildren;
		this.getChildren = function (this: SubscribeableViewNode<TView>) {
			this.loaded = true;
			void this.ensureSubscription();
			return getChildren.apply(this);
		};

		this.disposable = Disposable.from(...disposables);
	}

	@debug()
	dispose() {
		void this.unsubscribe();

		this.disposable?.dispose();
	}

	@gate()
	@debug()
	override async triggerChange(reset: boolean = false, force: boolean = false): Promise<void> {
		if (!this.loaded) return;

		if (reset && !this.view.visible) {
			this._pendingReset = reset;
		}
		await super.triggerChange(reset, force);
	}

	private _canSubscribe: boolean = true;
	protected get canSubscribe(): boolean {
		return this._canSubscribe;
	}
	protected set canSubscribe(value: boolean) {
		if (this._canSubscribe === value) return;

		this._canSubscribe = value;

		void this.ensureSubscription();
		if (value) {
			void this.triggerChange();
		}
	}

	private _etag: number | undefined;
	protected abstract etag(): number;

	private _pendingReset: boolean = false;
	private get requiresResetOnVisible(): boolean {
		let reset = this._pendingReset;
		this._pendingReset = false;

		const etag = this.etag();
		if (etag !== this._etag) {
			this._etag = etag;
			reset = true;
		}

		return reset;
	}

	protected abstract subscribe(): Disposable | undefined | Promise<Disposable | undefined>;

	@debug()
	protected async unsubscribe(): Promise<void> {
		this._etag = this.etag();

		if (this.subscription != null) {
			const subscriptionPromise = this.subscription;
			this.subscription = undefined;

			(await subscriptionPromise)?.dispose();
		}
	}

	@debug()
	protected onAutoRefreshChanged() {
		this.onVisibilityChanged({ visible: this.view.visible });
	}

	protected onParentCollapsibleStateChanged?(state: TreeItemCollapsibleState): void;
	protected onCollapsibleStateChanged?(state: TreeItemCollapsibleState): void;

	protected collapsibleState: TreeItemCollapsibleState | undefined;
	protected onNodeCollapsibleStateChanged(e: TreeViewNodeCollapsibleStateChangeEvent<ViewNode>) {
		if (e.element === this) {
			this.collapsibleState = e.state;
			if (this.onCollapsibleStateChanged !== undefined) {
				this.onCollapsibleStateChanged(e.state);
			}
		} else if (e.element === this.parent) {
			if (this.onParentCollapsibleStateChanged !== undefined) {
				this.onParentCollapsibleStateChanged(e.state);
			}
		}
	}

	@debug()
	protected onVisibilityChanged(e: TreeViewVisibilityChangeEvent) {
		void this.ensureSubscription();

		if (e.visible) {
			void this.triggerChange(this.requiresResetOnVisible);
		}
	}

	@gate()
	@debug()
	async ensureSubscription() {
		// We only need to subscribe if we are visible and if auto-refresh enabled (when supported)
		if (!this.canSubscribe || !this.view.visible || (canAutoRefreshView(this.view) && !this.view.autoRefresh)) {
			await this.unsubscribe();

			return;
		}

		// If we already have a subscription, just kick out
		if (this.subscription != null) return;

		this.subscription = Promise.resolve(this.subscribe());
		void (await this.subscription);
	}

	@gate()
	@debug()
	async resetSubscription() {
		await this.unsubscribe();
		await this.ensureSubscription();
	}
}

export interface PageableViewNode extends ViewNode {
	readonly id: string;
	limit?: number;
	readonly hasMore: boolean;
	loadMore(limit?: number | { until?: string | undefined }, context?: Record<string, unknown>): Promise<void>;
}

export function isPageableViewNode(node: ViewNode): node is ViewNode & PageableViewNode {
	return isA<ViewNode & PageableViewNode>(node, 'loadMore');
}
