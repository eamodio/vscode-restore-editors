'use strict';
import { OutputLevel } from './logger';

export interface IConfig {
    debug: boolean;
    outputLevel: OutputLevel;
    openPreview: boolean;
}