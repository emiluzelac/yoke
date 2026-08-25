import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCustomModels } from './validate';

const VALID = {
	id: 'deepseek-v4-flash-0731',
	name: 'DeepSeek V4 Flash (local)',
	maxInputTokens: 983040,
	maxOutputTokens: 65536,
};

test('accepts a minimal valid entry and applies defaults', () => {
	const { models, problems } = validateCustomModels([VALID]);
	assert.equal(problems.length, 0);
	assert.equal(models.length, 1);
	const model = models[0]!;
	assert.equal(model.id, 'deepseek-v4-flash-0731');
	assert.equal(model.maxInputTokens, 983040);
	assert.equal(model.family, 'local');
	assert.equal(model.version, '1');
	assert.equal(model.detail, 'DeepSeek V4 Flash (local)');
	assert.equal(model.capabilities.toolCalling, 128);
	assert.equal(model.capabilities.imageInput, true);
	assert.equal(model.capabilities.nativeImageInput, false);
	assert.equal(model.capabilities.thinking, false);
	assert.equal(model.requiresThinkingParam, false);
	assert.equal(model.pricing, undefined);
});

test('rejects a missing id but keeps sibling valid entries', () => {
	const { models, problems } = validateCustomModels([{ ...VALID, id: '  ' }, VALID]);
	assert.equal(models.length, 1);
	assert.equal(problems.length, 1);
	assert.match(problems[0]!, /customModels\[0\].*id/);
});

test('rejects non-integer and non-positive token limits', () => {
	const { models, problems } = validateCustomModels([
		{ ...VALID, maxInputTokens: 1.5 },
		{ ...VALID, maxOutputTokens: 0 },
	]);
	assert.equal(models.length, 0);
	assert.equal(problems.length, 2);
	assert.match(problems[0]!, /maxInputTokens/);
	assert.match(problems[1]!, /maxOutputTokens/);
});

test('rejects a defaultEffort outside supportedEfforts', () => {
	const { models, problems } = validateCustomModels([
		{ ...VALID, thinking: { supportedEfforts: ['low'], defaultEffort: 'max' } },
	]);
	assert.equal(models.length, 0);
	assert.match(problems[0]!, /defaultEffort/);
});

test('rejects an unknown effort value', () => {
	const { problems } = validateCustomModels([
		{ ...VALID, thinking: { supportedEfforts: ['medium'], defaultEffort: 'medium' } },
	]);
	assert.match(problems[0]!, /supportedEfforts/);
});

test('accepts a full thinking capability', () => {
	const { models, problems } = validateCustomModels([
		{
			...VALID,
			thinking: { supportedEfforts: ['low', 'high'], defaultEffort: 'high', canDisable: true },
		},
	]);
	assert.equal(problems.length, 0);
	assert.deepEqual(models[0]!.capabilities.thinking, {
		supportedEfforts: ['low', 'high'],
		defaultEffort: 'high',
		canDisable: true,
	});
});

test('maps thinkingParam to requiresThinkingParam', () => {
	const none = validateCustomModels([VALID]).models[0]!;
	const deepseek = validateCustomModels([{ ...VALID, thinkingParam: 'deepseek' }]).models[0]!;
	assert.equal(none.requiresThinkingParam, false);
	assert.equal(deepseek.requiresThinkingParam, true);
});

test('rejects an unknown thinkingParam', () => {
	const { problems } = validateCustomModels([{ ...VALID, thinkingParam: 'anthropic' }]);
	assert.match(problems[0]!, /thinkingParam/);
});

test('accepts toolCalling as false, true, or a positive integer', () => {
	const models = validateCustomModels([
		{ ...VALID, id: 'a', toolCalling: false },
		{ ...VALID, id: 'b', toolCalling: true },
		{ ...VALID, id: 'c', toolCalling: 64 },
	]).models;
	assert.equal(models[0]!.capabilities.toolCalling, false);
	assert.equal(models[1]!.capabilities.toolCalling, true);
	assert.equal(models[2]!.capabilities.toolCalling, 64);
});

test('rejects duplicate ids', () => {
	const { models, problems } = validateCustomModels([VALID, VALID]);
	assert.equal(models.length, 1);
	assert.match(problems[0]!, /duplicate/);
});

test('reports non-array input and yields no models', () => {
	const { models, problems } = validateCustomModels({ id: 'x' });
	assert.equal(models.length, 0);
	assert.match(problems[0]!, /array/);
});

test('treats undefined as empty with no problems', () => {
	const { models, problems } = validateCustomModels(undefined);
	assert.equal(models.length, 0);
	assert.equal(problems.length, 0);
});
