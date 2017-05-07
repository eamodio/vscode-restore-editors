'use strict';

export const ExtensionId = 'restore-editors';
export const ExtensionKey = 'restoreEditors';
export const ExtensionOutputChannelName = 'RestoreEditors';
export const QualifiedExtensionId = `eamodio.${ExtensionId}`;

export type BuiltInCommands = 'vscode.open' | 'setContext' | 'workbench.action.closeActiveEditor' | 'workbench.action.nextEditor';
export const BuiltInCommands = {
    CloseActiveEditor: 'workbench.action.closeActiveEditor' as BuiltInCommands,
    NextEditor: 'workbench.action.nextEditor' as BuiltInCommands,
    Open: 'vscode.open' as BuiltInCommands,
    SetContext: 'setContext' as BuiltInCommands
};

export type WorkspaceState = 'restoreEditors:documents';
export const WorkspaceState = {
    SavedDocuments: 'restoreEditors:documents' as WorkspaceState
};