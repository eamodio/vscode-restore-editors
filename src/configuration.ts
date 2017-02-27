'use strict';
import { OutputLevel } from './logger';

export interface IAdvancedConfig {
    debug: boolean;
    output: {
        level: OutputLevel;
    };
}

export interface IConfig {
    openPreview: boolean;
    advanced: IAdvancedConfig;
}