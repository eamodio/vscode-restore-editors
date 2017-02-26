'use strict';
import { commands, Disposable } from 'vscode';
import DocumentManager from './documentManager';

export type Commands = 'restoreEditors.reset' | 'restoreEditors.restore' | 'restoreEditors.save';
export const Commands = {
    Reset: 'restoreEditors.reset' as Commands,
    Restore: 'restoreEditors.restore' as Commands,
    Save: 'restoreEditors.save' as Commands
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

export class ResetCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Reset);
    }

    execute() {
        return this.documentManager.restore(true);
    }
}

export class RestoreCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Restore);
    }

    execute() {
        return this.documentManager.restore();
    }
}

export class SaveCommand extends Command {

    constructor(private documentManager: DocumentManager) {
        super(Commands.Save);
    }

    execute() {
        return this.documentManager.save();
   }
}
