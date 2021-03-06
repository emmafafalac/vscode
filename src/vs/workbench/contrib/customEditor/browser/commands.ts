/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { Command } from 'vs/editor/browser/editorExtensions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { CustomEditorInput } from 'vs/workbench/contrib/customEditor/browser/customEditorInput';
import { defaultCustomEditor } from 'vs/workbench/contrib/customEditor/common/contributedCustomEditors';
import { CONTEXT_CUSTOM_EDITORS, CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE, ICustomEditorService } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';


(new class UndoCustomEditorCommand extends Command {
	public static readonly ID = 'editor.action.customEditor.undo';

	constructor() {
		super({
			id: UndoCustomEditorCommand.ID,
			precondition: ContextKeyExpr.and(
				CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE,
				ContextKeyExpr.not(InputFocusedContextKey)),
			kbOpts: {
				primary: KeyMod.CtrlCmd | KeyCode.KEY_Z,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public runCommand(accessor: ServicesAccessor): void {
		const editorService = accessor.get<IEditorService>(IEditorService);
		const activeInput = editorService.activeEditorPane?.input;
		if (activeInput instanceof CustomEditorInput) {
			activeInput.undo();
		}
	}
}).register();

(new class RedoWebviewEditorCommand extends Command {
	public static readonly ID = 'editor.action.customEditor.redo';

	constructor() {
		super({
			id: RedoWebviewEditorCommand.ID,
			precondition: ContextKeyExpr.and(
				CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE,
				ContextKeyExpr.not(InputFocusedContextKey)),
			kbOpts: {
				primary: KeyMod.CtrlCmd | KeyCode.KEY_Y,
				secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z],
				mac: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public runCommand(accessor: ServicesAccessor): void {
		const editorService = accessor.get<IEditorService>(IEditorService);
		const activeInput = editorService.activeEditorPane?.input;
		if (activeInput instanceof CustomEditorInput) {
			activeInput.redo();
		}
	}
}).register();

(new class ToggleCustomEditorCommand extends Command {
	public static readonly ID = 'editor.action.customEditor.toggle';

	constructor() {
		super({
			id: ToggleCustomEditorCommand.ID,
			precondition: CONTEXT_CUSTOM_EDITORS,
		});
	}

	public runCommand(accessor: ServicesAccessor): void {
		const editorService = accessor.get<IEditorService>(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (!activeEditorPane) {
			return;
		}

		const activeGroup = activeEditorPane.group;
		const activeEditor = activeEditorPane.input;
		const targetResource = activeEditor.resource;

		if (!targetResource) {
			return;
		}

		const customEditorService = accessor.get<ICustomEditorService>(ICustomEditorService);

		let toggleView = defaultCustomEditor.id;
		if (!(activeEditor instanceof CustomEditorInput)) {
			const bestAvailableEditor = customEditorService.getContributedCustomEditors(targetResource).bestAvailableEditor;
			if (bestAvailableEditor) {
				toggleView = bestAvailableEditor.id;
			} else {
				return;
			}
		}

		const newEditorInput = customEditorService.createInput(targetResource, toggleView, activeGroup.id);

		editorService.replaceEditors([{
			editor: activeEditor,
			replacement: newEditorInput,
			options: {
				ignoreOverrides: true,
			}
		}], activeGroup);
	}
}).register();
