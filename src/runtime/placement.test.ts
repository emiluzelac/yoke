import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isStrandedInUiHost, UI_EXTENSION_KIND } from './placement';

const WORKSPACE_EXTENSION_KIND = 2;

test('a local window is never stranded, whichever host kind the extension reports', () => {
	assert.equal(
		isStrandedInUiHost({ remoteName: undefined, extensionKind: UI_EXTENSION_KIND }),
		false,
	);
	assert.equal(
		isStrandedInUiHost({ remoteName: undefined, extensionKind: WORKSPACE_EXTENSION_KIND }),
		false,
	);
});

test('a remote window with Yoke in the UI host is stranded', () => {
	for (const remoteName of ['ssh-remote', 'wsl', 'dev-container', 'tunnel']) {
		assert.equal(isStrandedInUiHost({ remoteName, extensionKind: UI_EXTENSION_KIND }), true);
	}
});

test('a remote window with Yoke on the remote host is fine', () => {
	assert.equal(
		isStrandedInUiHost({ remoteName: 'ssh-remote', extensionKind: WORKSPACE_EXTENSION_KIND }),
		false,
	);
});
