'use strict';
import { ExtensionContext } from 'vscode';
import { ResetCommand, RestoreCommand, SaveCommand } from './commands';
import DocumentManager from './documentManager';

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
    const documentManager = new DocumentManager(context);
    context.subscriptions.push(documentManager);

    context.subscriptions.push(new ResetCommand(documentManager));
    context.subscriptions.push(new RestoreCommand(documentManager));
    context.subscriptions.push(new SaveCommand(documentManager));
}

// this method is called when your extension is deactivated
export function deactivate() { }