import type { CancellationToken, Disposable } from 'vscode';

export class PromiseCancelledError<T extends Promise<any> = Promise<any>> extends Error {
	constructor(
		public readonly promise: T,
		message: string,
	) {
		super(message);
	}
}

export class PromiseCancelledErrorWithId<TKey, T extends Promise<any> = Promise<any>> extends PromiseCancelledError<T> {
	constructor(
		public readonly id: TKey,
		promise: T,
		message: string,
	) {
		super(promise, message);
	}
}

export function cancellable<T>(
	promise: Promise<T>,
	timeoutOrToken?: number | CancellationToken,
	options: {
		cancelMessage?: string;
		onDidCancel?(resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void;
	} = {},
): Promise<T> {
	if (timeoutOrToken == null || (typeof timeoutOrToken === 'number' && timeoutOrToken <= 0)) return promise;

	return new Promise((resolve, reject) => {
		let fulfilled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let disposable: Disposable | undefined;

		if (typeof timeoutOrToken === 'number') {
			timer = setTimeout(() => {
				if (typeof options.onDidCancel === 'function') {
					options.onDidCancel(resolve, reject);
				} else {
					reject(new PromiseCancelledError(promise, options.cancelMessage ?? 'TIMED OUT'));
				}
			}, timeoutOrToken);
		} else {
			disposable = timeoutOrToken.onCancellationRequested(() => {
				disposable?.dispose();
				if (fulfilled) return;

				if (typeof options.onDidCancel === 'function') {
					options.onDidCancel(resolve, reject);
				} else {
					reject(new PromiseCancelledError(promise, options.cancelMessage ?? 'CANCELLED'));
				}
			});
		}

		promise.then(
			() => {
				fulfilled = true;
				if (timer != null) {
					clearTimeout(timer);
				}
				disposable?.dispose();
				resolve(promise);
			},
			ex => {
				fulfilled = true;
				if (timer != null) {
					clearTimeout(timer);
				}
				disposable?.dispose();
				reject(ex);
			},
		);
	});
}

export interface Deferred<T> {
	readonly pending: boolean;
	readonly promise: Promise<T>;
	fulfill: (value: T) => void;
	cancel(): void;
}

export function defer<T>(): Deferred<T> {
	const deferred: Mutable<Deferred<T>> = {
		pending: true,
		promise: undefined!,
		fulfill: undefined!,
		cancel: undefined!,
	};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.fulfill = function (value) {
			deferred.pending = false;
			resolve(value);
		};
		deferred.cancel = function () {
			deferred.pending = false;
			reject();
		};
	});
	return deferred;
}

export function getDeferredPromiseIfPending<T>(deferred: Deferred<T> | undefined): Promise<T> | undefined {
	return deferred?.pending ? deferred.promise : undefined;
}

export function getSettledValue<T>(promise: PromiseSettledResult<T>): T | undefined;
export function getSettledValue<T>(promise: PromiseSettledResult<T>, defaultValue: NonNullable<T>): NonNullable<T>;
export function getSettledValue<T>(
	promise: PromiseSettledResult<T>,
	defaultValue: T | undefined = undefined,
): T | typeof defaultValue {
	return promise.status === 'fulfilled' ? promise.value : defaultValue;
}

export function isPromise<T>(obj: PromiseLike<T> | T): obj is Promise<T> {
	return obj instanceof Promise || typeof (obj as PromiseLike<T>)?.then === 'function';
}
