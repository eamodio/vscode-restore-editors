import type { LogLevel } from './system/logger.constants';

type DeprecatedOutputLevel =
	| /** @deprecated use `off` */ 'silent'
	| /** @deprecated use `error` */ 'errors'
	| /** @deprecated use `info` */ 'verbose';
export type OutputLevel = LogLevel | DeprecatedOutputLevel;

export interface Config {
	outputLevel: OutputLevel;
}

export function fromOutputLevel(level: OutputLevel): LogLevel {
	switch (level) {
		case /** @deprecated use `off` */ 'silent':
			return 'off';
		case /** @deprecated use `error` */ 'errors':
			return 'error';
		case /** @deprecated use `info` */ 'verbose':
			return 'info';
		default:
			return level;
	}
}
