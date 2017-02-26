'use strict';
import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { TextEditorComparer } from './comparers';
import { ISavedEditor, SavedEditor } from './savedEditor';

export default class DocumentManager extends Disposable {

    constructor(private context: ExtensionContext) {
        super(() => this.dispose());
    }

    dispose() { }

    async restore(reset: boolean = false) {
        const editors = this.context.workspaceState.get<ISavedEditor[]>('restoreEditors:documents').map(_ => new SavedEditor(_));
        if (!editors) return;

        if (reset) {
            // Close all opened documents
            while (window.activeTextEditor) {
                await commands.executeCommand('workbench.action.closeActiveEditor');
            }
        }

        for (const editor of editors) {
            await editor.open();
        }
    }

    async save() {
        const active = window.activeTextEditor;
        if (!active) return;

        const editorTracker = new ActiveEditorTracker();

        let editor = active;
        const openEditors: TextEditor[] = [];
        do {
            openEditors.push(editor);

            commands.executeCommand('workbench.action.nextEditor');
            editor = await editorTracker.wait();
        } while (!TextEditorComparer.equals(active, editor));

        editorTracker.dispose();

        const editors = openEditors.filter(_ => _.document && _.viewColumn).map(_ => {
            return {
                uri: _.document.uri.toJSON(),
                viewColumn: _.viewColumn
            };
        });

        this.context.workspaceState.update('restoreEditors:documents', editors);
    }
}

class ActiveEditorTracker extends Disposable {

    private _disposable: Disposable;
    private _resolver: (value?: TextEditor | PromiseLike<TextEditor>) => void;

    constructor() {
        super(() => this.dispose());

        this._disposable = window.onDidChangeActiveTextEditor(e => this._resolver(e));
    }

    dispose() {
        this._disposable && this._disposable.dispose();
    }

    wait(): Promise<TextEditor> {
        return new Promise<TextEditor>((resolve, reject) => this._resolver = resolve);
    }
}

