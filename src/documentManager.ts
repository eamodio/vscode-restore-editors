'use strict';
import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { TextEditorComparer } from './comparers';
import { ISavedEditor, SavedEditor } from './savedEditor';
import { Logger } from './logger';

export default class DocumentManager extends Disposable {

    constructor(private context: ExtensionContext) {
        super(() => this.dispose());
    }

    dispose() { }

    clear() {
        this.context.workspaceState.update('restoreEditors:documents', undefined);
    }

    get(): SavedEditor[] {
        const data = this.context.workspaceState.get<ISavedEditor[]>('restoreEditors:documents');
        return (data && data.map(_ => new SavedEditor(_))) || [];
    }

    async open(restore: boolean = false) {
        try {
            const editors = this.get();
            if (!editors.length) return;

            if (restore) {
                // Close all opened documents
                await commands.executeCommand('workbench.action.closeAllEditors');
            }

            for (const editor of editors) {
                await editor.open();
            }
        }
        catch (ex) {
            Logger.error('DocumentManager.restore', ex);
        }
    }

    async save() {
        try {
            const active = window.activeTextEditor;

            const editorTracker = new ActiveEditorTracker();

            let editor = active;
            const openEditors: TextEditor[] = [];
            do {
                openEditors.push(editor);

                commands.executeCommand('workbench.action.nextEditor');
                editor = await editorTracker.wait();
            } while (!TextEditorComparer.equals(active, editor));

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => !!_ && !!_.document && !!_.viewColumn)
                .map(_ => {
                    return {
                        uri: _.document.uri,
                        viewColumn: _.viewColumn
                    } as ISavedEditor;
                });

            this.context.workspaceState.update('restoreEditors:documents', editors);
        }
        catch (ex) {
            Logger.error('DocumentManager.save', ex);
        }
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

