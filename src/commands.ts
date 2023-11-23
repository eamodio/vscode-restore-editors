import { Disposable } from 'vscode';
import type { PaletteCommands } from './constants';
import type { Container } from './container';
import { showLayoutNameInput, showLayoutPicker } from './pickers/layoutPicker';
import { registerCommand } from './system/command';
import type { Command } from './system/decorators/command';
import { createCommandDecorator } from './system/decorators/command';

const registrableCommands: Command<keyof PaletteCommands>[] = [];
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

	@command('export')
	async export() {
		return this.container.layoutManager.export();
	}

	@command('import')
	async import() {
		return this.container.layoutManager.import();
	}

	@command('delete')
	async delete(id?: string) {
		if (id == null) {
			const pick = await this.showLayoutPicker({
				title: 'Delete Saved Layout',
				placeholder: 'Choose a saved layout to delete',
			});
			if (pick == null) return;

			id = pick.id;
		}
		return this.container.layoutManager.delete(id);
	}

	@command('replace')
	async replace(id?: string) {
		if (id == null) {
			const pick = await this.showLayoutPicker({
				title: 'Replace Saved Layout',
				placeholder: 'Choose a saved layout to replace',
			});
			if (pick == null) return;

			id = pick.id;
		}

		const descriptor = this.container.layoutManager.getDescriptor(id);
		if (descriptor == null) return;

		return this.container.layoutManager.save(descriptor);
	}

	@command('rename')
	async rename(id?: string, label?: string) {
		if (id == null) {
			const pick = await this.showLayoutPicker({
				title: 'Rename Saved Layout',
				placeholder: 'Choose a saved layout to rename',
			});
			if (pick == null) return;

			id = pick.id;
		}

		if (label == null) {
			const layouts = this.container.layoutManager.getLayoutsById();

			label = await showLayoutNameInput({
				title: 'Rename Saved Layout',
				prompt: 'Enter a new name for the layout',
				value: layouts[id]?.label,
				existing: Object.values(layouts)
					.filter(l => l.id !== id)
					.map(l => l.label),
			});
			if (label == null) return;
		}
		return this.container.layoutManager.rename(id, label);
	}

	@command('restore', {
		showErrorMessage: 'Unable to restore the layout. See output channel for more details',
	})
	async restore(id?: string) {
		if (id == null) {
			const pick = await this.showLayoutPicker({
				title: 'Restore Saved Layout',
				placeholder: 'Choose a saved layout to restore',
			});
			if (pick == null) return;

			id = pick.id;
		}
		return this.container.layoutManager.restore(id);
	}

	@command('save')
	async save(label?: string) {
		if (label == null) {
			label = await showLayoutNameInput({
				title: 'Save Layout',
				prompt: 'Enter a name for the layout',
				existing: this.container.layoutManager.getLayouts().map(l => l.label),
			});
			if (label == null) return;
		}
		return this.container.layoutManager.save(label);
	}

	private async showLayoutPicker(options?: { placeholder?: string; title?: string }) {
		const layouts = this.container.layoutManager.getLayouts().sort((a, b) => b.timestamp - a.timestamp);
		if (!layouts.length) return undefined;

		const pick = await showLayoutPicker(layouts, { ...options, autoPick: false });
		return pick;
	}
}
