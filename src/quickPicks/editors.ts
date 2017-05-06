'use strict';
import { QuickPickOptions, TextDocumentShowOptions, Uri, window, workspace } from 'vscode';
import { Commands, Keyboard } from '../commands';
import { CommandQuickPickItem, OpenFileCommandQuickPickItem, QuickPickItem } from './common';
import { IConfig } from '../configuration';
import { ExtensionKey } from '../constants';
import { SavedEditor } from '../documentManager';
import * as path from 'path';

export class EditorQuickPickItem extends OpenFileCommandQuickPickItem {

    constructor(uri: Uri) {
        const directory = path.dirname(workspace.asRelativePath(uri));

        super(uri, {
            label: `\u00a0\u00a0\u00a0\u00a0 $(file-symlink-file) ${path.basename(uri.fsPath)}`,
            description: directory === '.' ? '' : directory
        });
    }

    async execute(options: TextDocumentShowOptions = {}): Promise<{}> {
        if (options.preview === undefined) {
            options.preview = workspace.getConfiguration().get<IConfig>(ExtensionKey).openPreview;
        }
        return super.execute(options);
    }
}

export class EditorsQuickPick {

    static async show(editors: SavedEditor[], goBackCommand?: CommandQuickPickItem): Promise<EditorQuickPickItem | CommandQuickPickItem | undefined> {

        const items = editors.map(_ => new EditorQuickPickItem(_.uri)) as (EditorQuickPickItem | CommandQuickPickItem)[];

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

            items.splice(3, 0, new CommandQuickPickItem({
                label: `Saved Editors`,
                description: undefined
            }, Commands.ShowQuickEditors));
        }

        if (goBackCommand) {
            items.splice(0, 0, goBackCommand);
        }

        const scope = await Keyboard.instance.beginScope({ left: goBackCommand });

        const pick = await window.showQuickPick(items, {
            matchOnDescription: true,
            placeHolder: 'Showing saved editors',
            onDidSelectItem: (item: QuickPickItem) => {
                scope.setKeyCommand('right', item);
                if (typeof item.onDidSelect === 'function') {
                    item.onDidSelect();
                }
            }
        } as QuickPickOptions);

        if (!pick) return undefined;

        await scope.dispose();

        return pick;
    }
}