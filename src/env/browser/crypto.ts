export function uuid(): string {
	return globalThis.crypto.randomUUID();
}
