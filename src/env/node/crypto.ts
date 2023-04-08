import { randomUUID } from 'crypto';

export function uuid(): string {
	return randomUUID();
}
