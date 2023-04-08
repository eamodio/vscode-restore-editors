export function areEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (a == null || b == null) return false;

	const aType = typeof a;
	if (aType === typeof b && (aType === 'string' || aType === 'number' || aType === 'boolean')) return false;

	return JSON.stringify(a) === JSON.stringify(b);
}

export function updateRecordValue<T>(
	obj: Record<string, T> | undefined,
	key: string,
	value: T | undefined,
): Record<string, T> {
	if (obj == null) {
		obj = Object.create(null) as Record<string, T>;
	}

	if (value != null && (typeof value !== 'boolean' || value)) {
		if (typeof value === 'object') {
			obj[key] = { ...value };
		} else {
			obj[key] = value;
		}
	} else {
		const { [key]: _, ...rest } = obj;
		obj = rest;
	}
	return obj;
}
