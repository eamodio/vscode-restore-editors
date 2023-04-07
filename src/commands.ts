import { Disposable } from 'vscode';
import type { Container } from './container';
import { showTabsQuickPick } from './quickPicks/tabs';
import { registerCommand } from './system/command';
import type { Command } from './system/decorators/command';
import { createCommandDecorator } from './system/decorators/command';

const registrableCommands: Command[] = [];
const command = createCommandDecorator(registrableCommands);

export class CommandProvider implements Disposable {
	private readonly _disposable: Disposable;

	constructor(private readonly container: Container) {
		this._disposable = Disposable.from(
			...registrableCommands.map(({ name, method }) => registerCommand(name, method, this)),
		);
	}

	dispose() {
		this._disposable.dispose();
	}

	@command('clear')
	clear() {
		return this.container.layoutManager.clear();
	}

	@command('openSavedTab')
	async openSavedTab() {
		const layout = this.container.layoutManager.get();
		if (layout == null) return;

		const pick = await showTabsQuickPick(this.container, layout.tabs);
		return pick?.execute();
	}

	@command('restore', {
		showErrorMessage: 'Unable to restore the layout. See output channel for more details',
	})
	restore() {
		return this.container.layoutManager.restore();
	}

	@command('save')
	save() {
		return this.container.layoutManager.save();
	}
}
