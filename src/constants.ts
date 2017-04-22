'use strict';

export const ExtensionId = 'restore-editors';
export const ExtensionKey = 'restoreEditors';
export const QualifiedExtensionId = `eamodio.${ExtensionId}`;

export type BuiltInCommands = 'vscode.open' | 'setContext';
export const BuiltInCommands = {
    Open: 'vscode.open' as BuiltInCommands,
    SetContext: 'setContext' as BuiltInCommands
};

export type WorkspaceState = 'restoreEditors:documents';
export const WorkspaceState = {
    SavedDocuments: 'restoreEditors:documents' as WorkspaceState
};