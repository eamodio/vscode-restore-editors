export function flatten<T>(array: (T | T[])[]): T[] {
	return array.reduce((acc: T[], val: T | T[]) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
}

export function union<T>(...sources: T[][]): T[] {
	const set = new Set<T>();

	for (const source of sources) {
		for (const item of source) {
			set.add(item);
		}
	}

	return [...set];
}
