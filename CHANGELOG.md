# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## [1.0.1] - 2023-04-08

### Fixed

- Fixes missing activation event

## [1.0.0] - 2023-04-08

### Added

- Completely rewrote the extension to save, manage, and restore editor layouts
- Adds a _Saved Layouts_ view to the _Explorer_ side bar to manage all saved layouts for the current folder/workspace
- Adds the following commands to the _Command Palette_:
  - _Restore Editors: Save Current Layout..._ (`restoreEditors.save`) &mdash; saves the current editor layout
  - _Restore Editors: Restore Saved Layout..._ (`restoreEditors.restore`) &mdash; closes all opened editors and restores the saved editor layout
  - _Restore Editors: Replace Saved Layout..._ (`restoreEditors.replace`) &mdash; peplaces a saved editor layout with the current editor layout
  - _Restore Editors: Rename Saved Layout..._ (`restoreEditors.rename`) &mdash; renames a saved editor layout
  - _Restore Editors: Delete Saved Layout..._ (`restoreEditors.delete`) &mdash; deletes a saved editor layout

## [0.2.1] - 2017-05-07

- Adds preview of editors when selecting (highlighting) an item in the quick pick menu
- Adds `Saved Editors` grouping to the quick pick menu
- Changes to use the supported vscode api for opening editors
- Fixes full paths from sometimes showing up in the quick pick menu

## 0.1.1

- Fixes marketplace badge layout

## 0.1.0

- Adds `alt+right arrow` shortcut to open editors in the quick pick menu without closing the quick pick menu
- Changes shortcut key for the `Show Saved Editors` command to `ctrl+k ctrl+e` (`cmd+k cmd+e` on macOS) to not conflict with `alt+d` to get to the Debug menu on Windows
- Renames `restoreEditors.advanced.debug` setting to `restoreEditors.debug`
- Renames `restoreEditors.output.level` setting to `restoreEditors.outputLevel`

## 0.0.6

- Changes extension activation to be based on commands to reduce overhead
- Fixes more intermittent issues with editor tracking

## 0.0.5

- Fixes intermittent issues with more robust editor tracking

## 0.0.4

- Fixes issues where non-text editors could interfere with determining the open editors
- Attempts to fix [#2](https://github.com/eamodio/vscode-restore-editors/issues/2) - Opened editors aren't always properly saved
- Fixes issue with output channel logging

## 0.0.3

- Fixes possible issues with closing all existing editors when restoring editors

## 0.0.2

- Fixes logging to clean up on extension deactivate
- Removes unused dependencies and code

## 0.0.1

- Initial release

[unreleased]: https://github.com/eamodio/vscode-restore-editors/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/eamodio/vscode-restore-editors/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/eamodio/vscode-restore-editors/compare/v0.2.1...v1.0.0
