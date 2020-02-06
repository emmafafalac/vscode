/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { debug, workspace, commands, window, Disposable } from 'vscode';
import { basename } from 'path';
import { disposeAll } from '../utils';

suite('Debug', function () {

	test('breakpoints', async function () {
		assert.equal(debug.breakpoints.length, 0);
		let onDidChangeBreakpointsCounter = 0;
		const toDispose: Disposable[] = [];

		toDispose.push(debug.onDidChangeBreakpoints(() => {
			onDidChangeBreakpointsCounter++;
		}));

		debug.addBreakpoints([{ id: '1', enabled: true }, { id: '2', enabled: false, condition: '2 < 5' }]);
		assert.equal(onDidChangeBreakpointsCounter, 1);
		assert.equal(debug.breakpoints.length, 2);
		assert.equal(debug.breakpoints[0].id, '1');
		assert.equal(debug.breakpoints[1].id, '2');
		assert.equal(debug.breakpoints[1].condition, '2 < 5');

		debug.removeBreakpoints([{ id: '1', enabled: true }]);
		assert.equal(onDidChangeBreakpointsCounter, 2);
		assert.equal(debug.breakpoints.length, 1);

		debug.removeBreakpoints([{ id: '2', enabled: false }]);
		assert.equal(onDidChangeBreakpointsCounter, 3);
		assert.equal(debug.breakpoints.length, 0);

		disposeAll(toDispose);
	});

	test('start debugging', async function () {
		assert.equal(debug.activeDebugSession, undefined);
		let stoppedEvents = 0;
		let variablesReceived: () => void;
		let capabilitiesReceived: () => void;
		let initializedReceived: () => void;
		let configurationDoneReceived: () => void;

		const firstVariablesRetrieved = new Promise<void>(resolve => variablesReceived = resolve);
		const toDispose: Disposable[] = [];
		toDispose.push(debug.registerDebugAdapterTrackerFactory('node2', {
			createDebugAdapterTracker: () => ({
				onDidSendMessage: m => {
					if (m.event === 'stopped') {
						stoppedEvents++;
					}
					if (m.type === 'response' && m.command === 'variables') {
						variablesReceived();
					}
					if (m.event === 'capabilities') {
						capabilitiesReceived();
					}
					if (m.event === 'initialized') {
						initializedReceived();
					}
					if (m.command === 'configurationDone') {
						configurationDoneReceived();
					}
				}
			})
		}));
		console.log('staaaaaaaarting');

		const capabilitiesPromise = new Promise<void>(resolve => capabilitiesReceived = resolve);
		const initializedPromise = new Promise<void>(resolve => initializedReceived = resolve);
		const configurationDonePromise = new Promise<void>(resolve => configurationDoneReceived = resolve);
		console.log('awaiting on launc debug');
		commands.executeCommand('workbench.action.debug.start');
		console.log('start  debugging returned');

		console.log('awaiting on capabilities');
		await capabilitiesPromise;
		console.log('awaiting on initialized');
		await initializedPromise;
		console.log('awaiting on configuration done');
		await configurationDonePromise;

		assert.notEqual(debug.activeDebugSession, undefined);
		assert.equal(debug.activeDebugSession?.name, 'Launch debug.js');

		console.log('awaiting on first variables');
		await firstVariablesRetrieved;
		assert.equal(stoppedEvents, 1);

		const secondVariablesRetrieved = new Promise<void>(resolve => variablesReceived = resolve);
		console.log('awaiting on step over');
		await commands.executeCommand('workbench.action.debug.stepOver');
		console.log('awaiting on second variables');
		await secondVariablesRetrieved;
		assert.equal(stoppedEvents, 2);
		const editor = window.activeTextEditor;
		assert.notEqual(editor, undefined);
		assert.equal(basename(editor!.document.fileName), 'debug.js');

		const thirdVariablesRetrieved = new Promise<void>(resolve => variablesReceived = resolve);
		console.log('awaiting on step over second time');
		await commands.executeCommand('workbench.action.debug.stepOver');
		console.log('awaiting on third variables');
		await thirdVariablesRetrieved;
		assert.equal(stoppedEvents, 3);

		const fourthVariablesRetrieved = new Promise<void>(resolve => variablesReceived = resolve);
		console.log('awaiting on step into');
		await commands.executeCommand('workbench.action.debug.stepInto');
		console.log('awaiting on fourth variables');
		await fourthVariablesRetrieved;
		assert.equal(stoppedEvents, 4);

		const fifthVariablesRetrieved = new Promise<void>(resolve => variablesReceived = resolve);
		console.log('awaiting on step out');
		await commands.executeCommand('workbench.action.debug.stepOut');
		console.log('awaiting on fifth variables');
		await fifthVariablesRetrieved;
		assert.equal(stoppedEvents, 5);

		let sessionTerminated: () => void;
		toDispose.push(debug.onDidTerminateDebugSession(() => {
			sessionTerminated();
		}));
		const sessionTerminatedPromise = new Promise<void>(resolve => sessionTerminated = resolve);
		console.log('awaiting on stop');
		await commands.executeCommand('workbench.action.debug.stop');
		console.log('awaiting session terminated');
		await sessionTerminatedPromise;
		assert.equal(debug.activeDebugSession, undefined);

		disposeAll(toDispose);
		console.log('finished');
	});

	test('start debugging failure', async function () {
		let errorCount = 0;
		try {
			await debug.startDebugging(workspace.workspaceFolders![0], 'non existent');
		} catch (e) {
			errorCount++;
		}
		assert.equal(errorCount, 1);
	});
});
