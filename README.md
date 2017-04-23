[![](https://vsmarketplacebadge.apphb.com/version/eamodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=eamodio.restore-editors) [![](https://vsmarketplacebadge.apphb.com/installs/eamodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=eamodio.restore-editors) [![](https://vsmarketplacebadge.apphb.com/rating/eamodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=eamodio.restore-editors)
# Restore Editors

Quickly save and restore all of the open editors.

Editors are saved into a persisted per-folder "slot" for later retrieval. This basically means that saving the open editors for one opened folder, will not overwrite or interfere with saving/restoring/clearing editors in another opened folder.

> NOTE: Since VS Code doesn't yet support any API to access opened editors (see [vscode #15178](https://github.com/Microsoft/vscode/issues/15178)), this extension employs what amounts to a hack to gain access to them. As such there are many limitations in what can currently be saved and restored -- it is basically limited to only file-based text documents.

![preview](https://raw.githubusercontent.com/eamodio/vscode-restore-editors/master/images/preview.gif)

## Features

- Adds a `Show Saved Editors` command (`restoreEditors.showQuickEditors`) with a shortcut of `ctrl+k ctrl+e` (`cmd+k cmd+e` on macOS) to show a quick pick menu of the currently saved editors
  - Quickly see the set of saved editors; select an editor entry to open it
  - Provides entries to `Save Opened Editors`, `Open Saved Editors` when available, and `Clear Saved Editors` when available
  - Use the `alt+right arrow` shortcut on an entry to execute it without closing the quick pick menu

- Adds a `Save Opened Editors` command (`restoreEditors.save`) to save all of the open editors

- Adds a `Open Saved Editors` command (`restoreEditors.open`) to open previously saved editors

- Adds a `Restore Only Saved Editors` command (`restoreEditors.restore`) to restore (close all, then re-open) previously saved editors

- Adds a `Clear Saved Editors` command (`restoreEditors.clear`) to clear previously saved editors

## Extension Settings

|Name | Description
|-----|------------
|`restoreEditors.openPreview`|Specifies whether or not to open single editors in a preview tab

## Known Issues

- Many limitations as noted above
- [#1](https://github.com/eamodio/vscode-restore-editors/issues/1) - Do you have to cycle through the tabs?
