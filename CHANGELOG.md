## Release Notes

### 0.2.1
- Adds preview of editors when selecting (highlighting) an item in the quick pick menu
- Adds `Saved Editors` grouping to the quick pick menu
- Changes to use the supported vscode api for opening editors
- Fixes full paths from sometimes showing up in the quick pick menu

### 0.1.1
- Fixes marketplace badge layout

### 0.1.0
- Adds `alt+right arrow` shortcut to open editors in the quick pick menu without closing the quick pick menu
- Changes shortcut key for the `Show Saved Editors` command to `ctrl+k ctrl+e` (`cmd+k cmd+e` on macOS) to not conflict with `alt+d` to get to the Debug menu on Windows
- Renames `restoreEditors.advanced.debug` setting to `restoreEditors.debug`
- Renames `restoreEditors.output.level` setting to `restoreEditors.outputLevel`

### 0.0.6
- Changes extension activation to be based on commands to reduce overhead
- Fixes more intermittent issues with editor tracking

### 0.0.5
- Fixes intermittent issues with more robust editor tracking

### 0.0.4
- Fixes issues where non-text editors could interfere with determining the open editors
- Attempts to fix [#2](https://github.com/eamodio/vscode-restore-editors/issues/2) - Opened editors aren't always properly saved
- Fixes issue with output channel logging

### 0.0.3
- Fixes possible issues with closing all existing editors when restoring editors

### 0.0.2
- Fixes logging to clean up on extension deactivate
- Removes unused dependencies and code

### 0.0.1
- Initial release