import { LogLevel } from './system/logger.constants';

export enum OutputLevel {
	Silent = 'silent',
	Errors = 'errors',
	Verbose = 'verbose',
	Debug = 'debug',
}

export interface Config {
	openPreview: boolean;
	outputLevel: OutputLevel;
}

export function fromOutputLevel(level: LogLevel | OutputLevel): LogLevel {
	switch (level) {
		case OutputLevel.Silent:
			return LogLevel.Off;
		case OutputLevel.Errors:
			return LogLevel.Error;
		case OutputLevel.Verbose:
			return LogLevel.Info;
		case OutputLevel.Debug:
			return LogLevel.Debug;
		default:
			return level;
	}
}
