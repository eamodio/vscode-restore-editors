'use strict';
import { Command, Commands } from '../commands';
import DocumentManager from '../documentManager';

export class ClearCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Clear);
    }

    execute() {
        return this.documentManager.clear();
    }
}