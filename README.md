# Restore Editors

Quickly save and restore all of the open editors.

Editors are saved into a persisted per-folder "slot" for later retrieval. This basically means that saving the open editors for one opened folder, will not overwrite or interfere with saving/restoring/clearing editors in another opened folder.

![preview](https://raw.githubusercontent.com/eamodio/vscode-restore-editors/master/images/preview.gif)

## Features

- Provides a command to show a quick pick list of most available commands and previously saved editors
- Provides a command to save all of the open editors
- Provides a command to open previously saved editors
- Provides a command to restore (close all, then re-open) previously saved editors
- Provides a command to clear previously saved editors

## Extension Settings

|Name | Description
|-----|------------
|`restoreEditors.openPreview`|Specifies whether or not to open single editors in a preview tab

## Known Issues

None
