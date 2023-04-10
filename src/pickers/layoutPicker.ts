import type { Disposable, QuickPickItem } from 'vscode';
import { InputBoxValidationSeverity, window } from 'vscode';
import type { LayoutDescriptor } from '../constants';
import { fromNow } from '../system/date';
import { pluralize } from '../system/string';

export interface LayoutQuickPickItem extends QuickPickItem {
	id: string;
}

export async function showLayoutPicker(
	layouts: LayoutDescriptor[],
	options?: {
		autoPick?: boolean;
		picked?: string;
		placeholder?: string;
		title?: string;
	},
): Promise<LayoutQuickPickItem | undefined> {
	const items: LayoutQuickPickItem[] = [];
	let picked: LayoutQuickPickItem | undefined;

	let placeholder = options?.placeholder ?? 'Choose a saved layout';
	if (layouts.length === 0) {
		placeholder = 'No saved layouts found';
	} else {
		for (const l of layouts) {
			items.push({
				id: l.id,
				label: l.label,
				description: `${pluralize('tab', l.tabs)}${
					l.context ? ` on ${l.context}` : ''
				} \u00a0\u2022\u00a0 ${fromNow(l.timestamp)}`,
			});
			if (l.id === options?.picked) {
				picked = items[items.length - 1];
			}
		}
	}

	if (options?.autoPick && layouts.length === 1) return items[0];

	const quickpick = window.createQuickPick<LayoutQuickPickItem>();
	quickpick.ignoreFocusOut = true;

	const disposables: Disposable[] = [];

	try {
		const pick = await new Promise<LayoutQuickPickItem | undefined>(resolve => {
			disposables.push(
				quickpick.onDidHide(() => resolve(undefined)),
				quickpick.onDidAccept(() => {
					if (quickpick.activeItems.length !== 0) {
						resolve(quickpick.activeItems[0]);
					}
				}),
			);

			quickpick.title = options?.title;
			quickpick.placeholder = placeholder;
			quickpick.matchOnDetail = true;
			quickpick.items = items;
			if (picked != null) {
				quickpick.activeItems = [picked];
			}

			quickpick.show();
		});
		return pick;
	} finally {
		quickpick.dispose();
		disposables.forEach(d => void d.dispose());
	}
}

export function showLayoutNameInput(options?: {
	placeholder?: string;
	prompt?: string;
	title?: string;
	value?: string;
	existing?: string[];
}) {
	return window.showInputBox({
		title: options?.title,
		placeHolder: options?.placeholder ?? 'Layout name',
		prompt: options?.prompt ?? 'Enter a name for the layout',
		value: options?.value ?? '',
		validateInput: (value: string) => {
			if (value.length === 0) {
				return { message: 'Layout name cannot be empty', severity: InputBoxValidationSeverity.Error };
			}

			if (options?.existing?.includes(value)) {
				return { message: 'Layout name already exists', severity: InputBoxValidationSeverity.Error };
			}

			return undefined;
		},
	});
}
