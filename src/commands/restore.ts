'use strict';
import { Command, Commands } from '../commands';
import { DocumentManager } from '../documentManager';

export class RestoreCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Restore);
    }

    execute() {
        return this.documentManager.open(true);
    }
}