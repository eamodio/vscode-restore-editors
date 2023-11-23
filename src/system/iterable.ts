export function flatCount<T>(
	source: Iterable<T> | IterableIterator<T> | undefined,
	accumulator: (item: T) => number,
): number {
	if (source == null) return 0;

	let count = 0;
	for (const item of source) {
		count += accumulator(item);
	}
	return count;
}
