'use strict';

export interface IStatusBarConfig {
    enabled: boolean;
}

export type OutputLevel = 'silent' | 'errors' | 'verbose';
export const OutputLevel = {
    Silent: 'silent' as OutputLevel,
    Errors: 'errors' as OutputLevel,
    Verbose: 'verbose' as OutputLevel
};

export interface IAdvancedConfig {
    debug: boolean;
    output: {
        level: OutputLevel;
    };
}

export interface IConfig {
    statusBar: IStatusBarConfig;
    advanced: IAdvancedConfig;
}