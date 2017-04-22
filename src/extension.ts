'use strict';
import { ExtensionContext } from 'vscode';
import { ClearCommand, OpenCommand, RestoreCommand, SaveCommand } from './commands';
import { ShowQuickEditorsCommand } from './commands';
import { Keyboard } from './commands';
import { DocumentManager } from './documentManager';
import { Logger } from './logger';

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
    Logger.configure(context);

    const documentManager = new DocumentManager(context);
    context.subscriptions.push(documentManager);

    context.subscriptions.push(new Keyboard());

    context.subscriptions.push(new ClearCommand(documentManager));
    context.subscriptions.push(new OpenCommand(documentManager));
    context.subscriptions.push(new RestoreCommand(documentManager));
    context.subscriptions.push(new SaveCommand(documentManager));
    context.subscriptions.push(new ShowQuickEditorsCommand(documentManager));
}

// this method is called when your extension is deactivated
export function deactivate() { }