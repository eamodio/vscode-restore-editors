import type { CancellationToken, Disposable } from 'vscode';

export class PromiseCancelledError<T extends Promise<any> = Promise<any>> extends Error {
	constructor(public readonly promise: T, message: string) {
		super(message);
	}
}

export class PromiseCancelledErrorWithId<TKey, T extends Promise<any> = Promise<any>> extends PromiseCancelledError<T> {
	constructor(public readonly id: TKey, promise: T, message: string) {
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

export function isPromise<T>(obj: PromiseLike<T> | T): obj is Promise<T> {
	return obj instanceof Promise || typeof (obj as PromiseLike<T>)?.then === 'function';
}
