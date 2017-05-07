'use strict';
import { TextDocumentShowOptions, Uri, ViewColumn } from 'vscode';
import { openEditor } from './commands';

export interface ISavedEditor {
    uri: Uri;
    viewColumn: ViewColumn;
}

export class SavedEditor {

    uri: Uri;
    viewColumn: ViewColumn | undefined;

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

    async open(options?: TextDocumentShowOptions) {
        const defaults: TextDocumentShowOptions = {
            viewColumn: this.viewColumn,
            preserveFocus: true,
            preview: true
        };

        openEditor(this.uri, { ...defaults, ...(options || {}) });
    }
}