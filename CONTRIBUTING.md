# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

When contributing to this project, please first discuss the changes you wish to make via an issue before making changes.

Please note the [Code of Conduct](CODE_OF_CONDUCT.md) document, please follow it in all your interactions with this project.

## Your First Code Contribution

Unsure where to begin contributing? You can start by looking through the [`help-wanted`](https://github.com/eamodio/vscode-restore-editors/labels/help%20wanted) issues.

### Getting the code

```
git clone https://github.com/eamodio/vscode-restore-editors.git
```

Prerequisites

- [Git](https://git-scm.com/), `>= 2.7.2`
- [NodeJS](https://nodejs.org/), `>= 16.14.2`
- [yarn](https://yarnpkg.com/), `>= 1.22.19`

### Dependencies

From a terminal, where you have cloned the repository, execute the following command to install the required dependencies:

```
yarn
```

### Build

From a terminal, where you have cloned the repository, execute the following command to re-build the project from scratch:

```
yarn run rebuild
```

👉 **NOTE!** This will run a complete rebuild of the project.

Or to just run a quick build, use:

```
yarn run build
```

### Watch

During development you can use a watcher to make builds on changes quick and easy. From a terminal, where you have cloned the repository, execute the following command:

```
yarn run watch
```

Or use the provided `watch` task in VS Code, execute the following from the command palette (be sure there is no `>` at the start):

```
task watch
```

This will first do an initial full build and then watch for file changes, compiling those changes incrementally, enabling a fast, iterative coding experience.

👉 **Tip!** You can press <kbd>CMD+SHIFT+B</kbd> (<kbd>CTRL+SHIFT+B</kbd> on Windows, Linux) to start the watch task.

👉 **Tip!** You don't need to stop and restart the development version of Code after each change. You can just execute `Reload Window` from the command palette.

### Formatting

This project uses [prettier](https://prettier.io/) for code formatting. You can run prettier across the code by calling `yarn run pretty` from a terminal.

To format the code as you make changes you can install the [Prettier - Code formatter](https://marketplace.visualstudio.com/items/esbenp.prettier-vscode) extension.

Add the following to your User Settings to run prettier:

```
"editor.formatOnSave": true,
```

### Linting

This project uses [ESLint](https://eslint.org/) for code linting. You can run ESLint across the code by calling `yarn run lint` from a terminal. Warnings from ESLint show up in the `Errors and Warnings` quick box and you can navigate to them from inside VS Code.

To lint the code as you make changes you can install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension.

### Bundling

To generate a production bundle (without packaging) run the following from a terminal:

```
yarn run bundle
```

To generate a VSIX (installation package) run the following from a terminal:

```
yarn run package
```

### Debugging

#### Using VS Code (desktop)

1. Open the `vscode-restore-editors` folder
2. Ensure the required [dependencies](#dependencies) are installed
3. Choose the `Watch & Run` launch configuration from the launch dropdown in the Run and Debug viewlet and press `F5`.

#### Using VS Code (desktop webworker)

1. Open the `vscode-restore-editors` folder
2. Ensure the required [dependencies](#dependencies) are installed
3. Choose the `Watch & Run (web)` launch configuration from the launch dropdown in the Run and Debug viewlet and press `F5`.

#### Using VS Code for the Web (locally)

See https://code.visualstudio.com/api/extension-guides/web-extensions#test-your-web-extension-in-a-browser-using-vscodetestweb

1. Open the `vscode-restore-editors` folder
2. Ensure the required [dependencies](#dependencies) are installed
3. Run the `build` or `watch` task from the command palette
4. Run the `Run (local web)` task from the command palette

#### Using VS Code for the Web (vscode.dev)

See https://code.visualstudio.com/api/extension-guides/web-extensions#test-your-web-extension-in-on-vscode.dev

1. Open the `vscode-restore-editors` folder
2. Ensure the required [dependencies](#dependencies) are installed
3. Run the `build` or `watch` task from the command palette
4. Run the `Run (vscode.dev)` task from the command palette

## Submitting a Pull Request

Please follow all the instructions in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

### Update the CHANGELOG

The [Change Log](CHANGELOG.md) is updated manually and an entry should be added for each change. Changes are grouped in lists by `added`, `changed`, `removed`, or `fixed`.

Entries should be written in future tense:

- Be sure to give yourself much deserved credit by adding your name and user in the entry

> Added
>
> - Adds awesome feature &mdash; closes [#\<issue\>](https://github.com/eamodio/vscode-restore-editors/issues/<issue>) thanks to [PR #\<pr\>](https://github.com/eamodio/vscode-restore-editors/issues/<pr>) by Your Name ([@\<your-github-username\>](https://github.com/<your-github-username>))
>
> Changed
>
> - Changes or improves an existing feature &mdash; closes [#\<issue\>](https://github.com/eamodio/vscode-restore-editors/issues/<issue>) thanks to [PR #\<pr\>](https://github.com/eamodio/vscode-restore-editors/issues/<pr>) by Your Name ([@\<your-github-username\>](https://github.com/<your-github-username>))
>
> Fixed
>
> - Fixes [#\<issue\>](https://github.com/eamodio/vscode-restore-editors/issues/<issue>) a bug or regression &mdash; thanks to [PR #\<pr\>](https://github.com/eamodio/vscode-restore-editors/issues/<pr>) by Your Name ([@\<your-github-username\>](https://github.com/<your-github-username>))

### Update the README

If this is your first contribution to Restore Editors, please give yourself credit by adding yourself to the `Contributors` section of the [README](README.md#contributors-) in the following format:

> - `Your Name ([@<your-github-username>](https://github.com/<your-github-username>)) &mdash; [contributions](https://github.com/eamodio/vscode-restore-editors/commits?author=<your-github-username>)`
