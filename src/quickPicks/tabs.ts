import type { QuickPickItem, QuickPickOptions, TextDocumentShowOptions } from 'vscode';
import { QuickPickItemKind, ViewColumn, window } from 'vscode';
import type { Keys } from '../constants';
import type { Container } from '../container';
import { openTab } from '../layoutManager';
import type { StoredTab } from '../storage';
import { configuration } from '../system/configuration';
import { CommandQuickPickItem } from './common';

const openableTabTypes = new Set<StoredTab['type']>([
	'text',
	'custom',
	'notebook',
	'diff',
	'notebook-diff',
	'terminal',
]);

export class TabQuickPickItem extends CommandQuickPickItem {
	constructor(public readonly tab: StoredTab) {
		let item: QuickPickItem;
		switch (tab.type) {
			case 'text':
			case 'custom':
				item = { label: `$(file) ${tab.label}` };
				break;
			case 'notebook':
				item = { label: `$(notebook) ${tab.label}` };
				break;
			case 'diff':
			case 'notebook-diff':
				item = { label: `$(diff) ${tab.label}` };
				break;
			case 'terminal':
				item = { label: `$(terminal) ${tab.label}` };
				break;
			default:
				debugger;
				throw new Error(`Invalid tab type: ${tab.type}`);
		}

		super(item);
	}

	override async execute(options?: TextDocumentShowOptions): Promise<void> {
		if (options?.preview == null) {
			if (options == null) {
				options = {};
			}
			options.preview = configuration.get('openPreview');
		}
		return openTab(this.tab, options);
	}

	onDidSelect(): void {
		void this.execute({
			preserveFocus: true,
			preview: true,
			viewColumn: ViewColumn.Active,
		});
	}

	override async onDidPressKey(_key: Keys): Promise<void> {
		await this.execute({
			preserveFocus: true,
			preview: false,
			viewColumn: ViewColumn.Active,
		});
	}
}

export async function showTabsQuickPick(
	container: Container,
	tabs: StoredTab[],
): Promise<TabQuickPickItem | CommandQuickPickItem | undefined> {
	const items: (TabQuickPickItem | CommandQuickPickItem)[] = tabs
		.filter(t => openableTabTypes.has(t.type))
		.map(t => new TabQuickPickItem(t));

	items.splice(
		0,
		0,
		new CommandQuickPickItem(
			{
				label: `$(cloud-upload) Save Editor Layout`,
				description: '',
				detail: `Saves the current editor layout`,
			},
			'restoreEditors.save',
		),
	);

	if (items.length > 1) {
		items.splice(
			0,
			0,
			new CommandQuickPickItem(
				{
					label: `$(cloud-download) Restore Saved Editor Layout`,
					description: '',
					detail: `Restores the previously saved editor layout`,
				},
				'restoreEditors.restore',
			),
		);

		items.splice(
			2,
			0,
			new CommandQuickPickItem(
				{
					label: `$(x) Clear Saved Editor Layout`,
					description: '',
					detail: `Clears the previously saved editor layout`,
				},
				'restoreEditors.clear',
			),
		);

		items.splice(3, 0, {
			label: `Saved Tabs`,
			description: '',
			kind: QuickPickItemKind.Separator,
		} satisfies QuickPickItem as any);
	}

	const scope = await container.keyboard.beginScope();
	try {
		const pick = await window.showQuickPick(items, {
			ignoreFocusOut: true,
			matchOnDescription: true,
			placeHolder: 'Showing saved editor tabs',
			onDidSelectItem: (item: QuickPickItem) => {
				void scope.setKeyCommand('right', item);
				item.onDidSelect?.();
			},
		} satisfies QuickPickOptions);
		return pick;
	} finally {
		await scope.dispose();
	}
}
