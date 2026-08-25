import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRegistryPayload } from './validate';

const ENTRY = {
	id: 'deepseek-v4-flash-0731',
	name: 'deepseek-v4-flash-0731 (local)',
	maxInputTokens: 983040,
	maxOutputTokens: 65536,
};

test('accepts a registry payload and applies the customModels rules', () => {
	const { models, problems } = parseRegistryPayload({ generatedAt: 'now', models: [ENTRY] });
	assert.equal(problems.length, 0);
	assert.equal(models.length, 1);
	assert.equal(models[0]!.id, 'deepseek-v4-flash-0731');
	assert.equal(models[0]!.maxInputTokens, 983040);
});

test('ignores the extra fields the registry adds for humans', () => {
	const { models, problems } = parseRegistryPayload({
		models: [{ ...ENTRY, endpoint: 'lane', baseUrl: 'http://127.0.0.1:8888/v1' }],
	});
	assert.equal(problems.length, 0);
	assert.equal(models.length, 1);
});

test('a bad entry is dropped without losing the good ones', () => {
	const { models, problems } = parseRegistryPayload({
		models: [{ ...ENTRY, id: '  ' }, ENTRY],
	});
	assert.equal(models.length, 1);
	assert.equal(problems.length, 1);
});

test('a malformed response yields problems, never a throw', () => {
	assert.deepEqual(parseRegistryPayload(null).models, []);
	assert.match(parseRegistryPayload(null).problems[0]!, /not an object/);
	assert.match(parseRegistryPayload({}).problems[0]!, /no "models" array/);
	assert.match(parseRegistryPayload({ models: 'nope' }).problems[0]!, /array/);
});

test('an empty registry is valid and simply contributes nothing', () => {
	const { models, problems } = parseRegistryPayload({ models: [] });
	assert.equal(models.length, 0);
	assert.equal(problems.length, 0);
});
