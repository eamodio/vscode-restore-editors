import { hrtime } from '@env/hrtime';

let compareCollator: Intl.Collator | undefined;
export function compareIgnoreCase(a: string, b: string): 0 | -1 | 1 {
	if (compareCollator == null) {
		compareCollator = new Intl.Collator(undefined, { sensitivity: 'accent' });
	}
	const result = compareCollator.compare(a, b);
	// Intl.Collator.compare isn't guaranteed to always return 1 or -1 on all platforms so normalize it
	return result === 0 ? 0 : result > 0 ? 1 : -1;
}

export function equalsIgnoreCase(a: string | null | undefined, b: string | null | undefined): boolean {
	// Treat `null` & `undefined` as equivalent
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;
	return compareIgnoreCase(a, b) === 0;
}

export function getDurationMilliseconds(start: [number, number]) {
	const [secs, nanosecs] = hrtime(start);
	return secs * 1000 + Math.floor(nanosecs / 1000000);
}

export function pluralize(
	s: string,
	count: number,
	options?: {
		/** Controls the character/string between the count and the string */
		infix?: string;
		/** Formats the count */
		format?: (count: number) => string | undefined;
		/** Controls if only the string should be included */
		only?: boolean;
		/** Controls the plural version of the string */
		plural?: string;
		/** Controls the string for a zero value */
		zero?: string;
	},
) {
	if (options == null) return `${count} ${s}${count === 1 ? '' : 's'}`;

	const suffix = count === 1 ? s : options.plural ?? `${s}s`;
	if (options.only) return suffix;

	return `${count === 0 ? options.zero ?? count : options.format?.(count) ?? count}${options.infix ?? ' '}${suffix}`;
}
