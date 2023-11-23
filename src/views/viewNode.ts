import type { Command, Disposable, TreeItem } from 'vscode';
import type { TreeViewNodeTypes, Views } from '../constants';
import { gate } from '../system/decorators/gate';
import { debug, logName } from '../system/decorators/log';
import { getLoggableName } from '../system/logger';
import type { LayoutNode } from './layouts/layoutNode';
import type { LayoutsViewNode } from './layouts/layoutsView';
import type { LayoutTabNode } from './layouts/layoutTabNode';

export interface AmbientContext {
	layoutId?: string;
}

export function getViewNodeId(type: string, context: AmbientContext): string {
	let uniqueness = '';
	if (context.layoutId != null) {
		uniqueness += `/layouts/${context.layoutId}`;
	}

	return `restoreEditors://viewnode/${type}${uniqueness}`;
}

@logName<ViewNode>((c, name) => `${name}${c.id != null ? `(${c.id})` : ''}`)
export abstract class ViewNode<
	Type extends TreeViewNodeTypes = TreeViewNodeTypes,
	View extends Views = Views,
	State extends object = any,
> implements Disposable
{
	is<T extends keyof TreeViewNodesByType>(type: T): this is TreeViewNodesByType[T] {
		return this.type === (type as unknown as Type);
	}

	protected _uniqueId!: string;
	protected splatted = false;
	// NOTE: @eamodio uncomment to track node leaks
	// readonly uuid = uuid();

	constructor(
		public readonly type: Type,
		public readonly view: View,
		protected parent?: ViewNode,
	) {
		// NOTE: @eamodio uncomment to track node leaks
		// queueMicrotask(() => this.view.registerNode(this));
	}

	protected _disposed = false;
	@debug()
	dispose() {
		this._disposed = true;
		// NOTE: @eamodio uncomment to track node leaks
		// this.view.unregisterNode(this);
	}

	get id(): string | undefined {
		return this._uniqueId;
	}

	private _context: AmbientContext | undefined;
	protected get context(): AmbientContext {
		return this._context ?? this.parent?.context ?? {};
	}

	protected updateContext(context: AmbientContext, reset: boolean = false) {
		this._context = this.getNewContext(context, reset);
	}

	protected getNewContext(context: AmbientContext, reset: boolean = false) {
		return { ...(reset ? this.parent?.context : this.context), ...context };
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

	@gate<ViewNode['triggerChange']>((reset, force, avoidSelf) => `${reset}|${force}|${avoidSelf?.toString()}`)
	@debug()
	triggerChange(reset: boolean = false, force: boolean = false, avoidSelf?: ViewNode): Promise<void> {
		if (this._disposed) return Promise.resolve();

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
		this.view.nodeState.deleteState(this.id, key as string);
	}

	getState<T extends StateKey<State> = StateKey<State>>(key: T): StateValue<State, T> | undefined {
		if (this.id == null) {
			debugger;
			throw new Error('Id is required to get state');
		}
		return this.view.nodeState.getState(this.id, key as string);
	}

	storeState<T extends StateKey<State> = StateKey<State>>(
		key: T,
		value: StateValue<State, T>,
		sticky?: boolean,
	): void {
		if (this.id == null) {
			debugger;
			throw new Error('Id is required to store state');
		}
		this.view.nodeState.storeState(this.id, key as string, value, sticky);
	}
}

type StateKey<T> = keyof T;
type StateValue<T, P extends StateKey<T>> = P extends keyof T ? T[P] : never;

type TreeViewNodesByType = {
	[T in TreeViewNodeTypes]: T extends 'layouts'
		? LayoutsViewNode
		: T extends 'layout'
		  ? LayoutNode
		  : T extends 'tab'
		    ? LayoutTabNode
		    : ViewNode<T>;
};

export function isViewNode(node: unknown): node is ViewNode;
export function isViewNode<T extends keyof TreeViewNodesByType>(node: unknown, type: T): node is TreeViewNodesByType[T];
export function isViewNode<T extends keyof TreeViewNodesByType>(node: unknown, type?: T): node is ViewNode {
	if (node == null) return false;
	return node instanceof ViewNode ? type == null || node.type === type : false;
}
