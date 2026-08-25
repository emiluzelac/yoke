import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MIGRATED_SETTINGS, planSettingMigration } from './plan';

test('copies a legacy value when the new key is unset', () => {
	const plan = planSettingMigration(
		{ globalValue: 'http://127.0.0.1:8888' },
		{ globalValue: undefined },
	);
	assert.deepEqual(plan, { global: 'http://127.0.0.1:8888' });
});

test('never clobbers a value already set under the new namespace', () => {
	const plan = planSettingMigration({ globalValue: 'old' }, { globalValue: 'new' });
	assert.deepEqual(plan, {});
});

test('migrates global and workspace scopes independently', () => {
	const plan = planSettingMigration(
		{ globalValue: 'g', workspaceValue: 'w' },
		{ globalValue: 'kept' },
	);
	assert.deepEqual(plan, { workspace: 'w' });
});

test('does nothing when there is no legacy value', () => {
	assert.deepEqual(planSettingMigration({}, {}), {});
});

test('is idempotent — a second run after applying plans nothing', () => {
	const legacy = { globalValue: 'v' };
	const first = planSettingMigration(legacy, { globalValue: undefined });
	assert.deepEqual(first, { global: 'v' });
	assert.deepEqual(planSettingMigration(legacy, { globalValue: first.global }), {});
});

test('covers every user-facing setting', () => {
	assert.deepEqual([...MIGRATED_SETTINGS].sort(), [
		'baseUrl',
		'customModels',
		'debugMode',
		'experimental.stabilizeToolList',
		'maxTokens',
		'modelIdOverrides',
		'visionModel',
		'visionPrompt',
	]);
});
