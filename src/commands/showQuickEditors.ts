'use strict';
import { QuickPickOptions, window, workspace } from 'vscode';
import { Command, CommandQuickPickItem, Commands, OpenFileCommandQuickPickItem } from '../commands';
import { IConfig } from '../configuration';
import DocumentManager from '../documentManager';

export class ShowQuickEditorsCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.ShowQuickEditors);
    }

    async execute() {
        const editors = this.documentManager.get();
        const items = editors.map(_ => new OpenFileCommandQuickPickItem(_.uri, workspace.rootPath)) as (CommandQuickPickItem | OpenFileCommandQuickPickItem)[];

        items.splice(0, 0, new CommandQuickPickItem({
            label: `$(cloud-upload) Save Opened Editors`,
            description: undefined,
            detail: `Saves the basic layout of the open editors`
        }, Commands.Save));

        if (items.length > 1) {
            items.splice(0, 0, new CommandQuickPickItem({
                label: `$(cloud-download) Open Saved Editors`,
                description: undefined,
                detail: `Opens all of the previously saved editors`
            }, Commands.Open));

            items.splice(2, 0, new CommandQuickPickItem({
                label: `$(x) Clear Saved Editors`,
                description: undefined,
                detail: `Clears the previously saved editors`
            }, Commands.Clear));
        }

        const pick = await window.showQuickPick(items, {
            matchOnDescription: true,
            placeHolder: `Showing saved editors`
        } as QuickPickOptions);

        if (!pick) return undefined;

        if (pick instanceof OpenFileCommandQuickPickItem) {
            return pick.execute(workspace.getConfiguration('').get<IConfig>('restoreEditors').openPreview);
        }

        return pick.execute();
    }
}