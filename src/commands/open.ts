'use strict';
import { Command, Commands } from '../commands';
import DocumentManager from '../documentManager';

export class OpenCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Open);
    }

    execute() {
        return this.documentManager.open();
    }
}