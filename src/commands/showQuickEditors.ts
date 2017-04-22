'use strict';
import { Command, Commands } from '../commands';
import { EditorsQuickPick } from '../quickPicks';
import { DocumentManager } from '../documentManager';

export class ShowQuickEditorsCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.ShowQuickEditors);
    }

    async execute() {
        const editors = this.documentManager.get();

        const pick = await EditorsQuickPick.show(editors);
        if (!pick) return undefined;

        return pick.execute();
    }
}