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
