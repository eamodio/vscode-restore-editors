'use strict';
import { commands, Uri, ViewColumn, window, workspace } from 'vscode';
import { BuiltInCommands } from './constants';
import { Logger } from './logger';

export interface ISavedEditor {
    uri: Uri;
    viewColumn: ViewColumn;
}

export class SavedEditor {

    uri: Uri;
    viewColumn: ViewColumn;

    constructor(savedEditor: ISavedEditor);
    constructor(uri: string, viewColumn: ViewColumn);
    constructor(savedEditorOrUri: ISavedEditor | string, viewColumn?: ViewColumn) {
        if (typeof savedEditorOrUri === 'string') {
            this.uri = Uri.parse(savedEditorOrUri);
            this.viewColumn = viewColumn;
        }
        else {
            if (typeof savedEditorOrUri.uri === 'string') {
                this.uri = Uri.parse(savedEditorOrUri.uri);
            }
            else if (savedEditorOrUri.uri instanceof Uri) {
                this.uri = savedEditorOrUri.uri;
            }
            else {
                this.uri = new Uri().with(savedEditorOrUri.uri);
            }
            this.viewColumn = savedEditorOrUri.viewColumn;
        }
    }

    async open(preview: boolean = false) {
        try {
            if (preview) {
                return commands.executeCommand(BuiltInCommands.Open, this.uri, this.viewColumn);
            }
            else {
                const document = await workspace.openTextDocument(this.uri);
                return window.showTextDocument(document, this.viewColumn);
            }
        }
        catch (ex) {
            Logger.error(ex, 'SavedEditor.open');
            return undefined;
        }
    }
}