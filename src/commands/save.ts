'use strict';
import { Command, Commands } from '../commands';
import DocumentManager from '../documentManager';

export class SaveCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Save);
    }

    execute() {
        return this.documentManager.save();
   }
}