'use strict';
import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { ActiveEditorTracker } from './activeEditorTracker';
import { TextEditorComparer } from './comparers';
import { ISavedEditor, SavedEditor } from './savedEditor';
import { Logger } from './logger';

export class DocumentManager extends Disposable {

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
            const editorTracker = new ActiveEditorTracker();

            let active = window.activeTextEditor;
            let editor = active;
            const openEditors: TextEditor[] = [];
            do {
                if (editor) {
                    // If we didn't start with a valid editor, set one once we find it
                    if (!active) {
                        active = editor;
                    }

                    openEditors.push(editor);
                }

                editor = await editorTracker.awaitNext(500);
                if (editor && openEditors.some(_ => TextEditorComparer.equals(_, editor, { useId: true, usePosition: true }))) {
                    break;
                }
            } while ((!active && !editor) || !TextEditorComparer.equals(active, editor, { useId: true, usePosition: true }));

            editorTracker.dispose();

            const editors = openEditors
                .filter(_ => _.document)
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