'use strict';
import { commands, Disposable, QuickPickItem, Uri, window, workspace } from 'vscode';
import { BuiltInCommands } from './constants';
import { Logger } from './logger';
import * as path from 'path';

export type Commands = 'restoreEditors.clear' | 'restoreEditors.open' | 'restoreEditors.restore' | 'restoreEditors.save' | 'restoreEditors.showQuickEditors';
export const Commands = {
    Clear: 'restoreEditors.clear' as Commands,
    Open: 'restoreEditors.open' as Commands,
    Restore: 'restoreEditors.restore' as Commands,
    Save: 'restoreEditors.save' as Commands,
    ShowQuickEditors: 'restoreEditors.showQuickEditors' as Commands,
};

export abstract class Command extends Disposable {

    private _disposable: Disposable;

    constructor(command: Commands) {
        super(() => this.dispose());
        this._disposable = commands.registerCommand(command, this.execute, this);
    }

    dispose() {
        this._disposable && this._disposable.dispose();
    }

    abstract execute(...args: any[]): any;
}

export class CommandQuickPickItem implements QuickPickItem {

    label: string;
    description: string;
    detail: string;

    constructor(item: QuickPickItem, protected command: Commands, protected args?: any[]) {
        Object.assign(this, item);
    }

    execute(): Thenable<{}> {
        return commands.executeCommand(this.command, ...(this.args || []));
    }
}

export class OpenFileCommandQuickPickItem extends CommandQuickPickItem {
    label: string;
    description: string;
    detail: string;

    constructor(private uri: Uri, workspace: string) {
        super({
            label: `$(file-symlink-file) ${path.basename(uri.fsPath)}`,
            description: path.relative(workspace, path.dirname(uri.fsPath))
        }, undefined, undefined);
    }

    async execute(preview: boolean = true): Promise<{}> {
        try {
            if (preview) {
                return commands.executeCommand(BuiltInCommands.Open, this.uri);
            }
            else {
                const document = await workspace.openTextDocument(this.uri);
                return await window.showTextDocument(document, 1);
            }
        }
        catch (ex) {
            Logger.error('OpenFileCommandQuickPickItem.execute', ex);
            return undefined;
        }
    }
}
