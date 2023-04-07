export function areEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (a == null || b == null) return false;

	const aType = typeof a;
	if (aType === typeof b && (aType === 'string' || aType === 'number' || aType === 'boolean')) return false;

	return JSON.stringify(a) === JSON.stringify(b);
}
