[![](https://vsmarketplacebadges.dev/version-short/amodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=amodio.restore-editors)
[![](https://vsmarketplacebadges.dev/installs-short/amodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=amodio.restore-editors)
[![](https://vsmarketplacebadges.dev/rating-short/amodio.restore-editors.svg)](https://marketplace.visualstudio.com/items?itemName=amodio.restore-editors)

# Restore Editors

Quickly save, manage, and restore editor layouts.

Saved editor layouts are persisted per-folder/workspace.

![preview](https://raw.githubusercontent.com/eamodio/vscode-restore-editors/main/images/preview.gif)

## Features

- Adds a _Saved Layouts_ view to the _Explorer_ side bar to manage all saved layouts for the current folder/workspace
- Adds the following commands to the _Command Palette_:
  - _Restore Editors: Save Current Layout..._ (`restoreEditors.save`) &mdash; saves the current editor layout
  - _Restore Editors: Restore Saved Layout..._ (`restoreEditors.restore`) &mdash; closes all opened editors and restores the saved editor layout
  - _Restore Editors: Replace Saved Layout..._ (`restoreEditors.replace`) &mdash; peplaces a saved editor layout with the current editor layout
  - _Restore Editors: Rename Saved Layout..._ (`restoreEditors.rename`) &mdash; renames a saved editor layout
  - _Restore Editors: Delete Saved Layout..._ (`restoreEditors.delete`) &mdash; deletes a saved editor layout

## Extension Settings

| Name                         | Description                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `restoreEditors.outputLevel` | Specifies how much (if any) output will be sent to the _Restore Editors_ output channel |

## Known Issues

- Cannot restore webviews &mdash; not supported by the VS Code API
- Cannot properly restore terminals &mdash; not supported by the VS Code API
