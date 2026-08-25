import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThinkingRequestFields } from './thinking';
import type { ModelDefinition } from '../types';

const base: ModelDefinition = {
	id: 'm',
	name: 'M',
	family: 'local',
	version: '1',
	detail: 'd',
	maxInputTokens: 1000,
	maxOutputTokens: 100,
	capabilities: {
		toolCalling: 128,
		imageInput: true,
		thinking: { supportedEfforts: ['low', 'high'], defaultEffort: 'high', canDisable: true },
	},
	requiresThinkingParam: false,
};

test('a DeepSeek model sends the thinking field and the effort', () => {
	const cloud = { ...base, requiresThinkingParam: true };
	assert.deepEqual(buildThinkingRequestFields(cloud, 'high'), {
		thinking: { type: 'enabled' },
		reasoning_effort: 'high',
	});
});

test('a DeepSeek model disables thinking with the field and no effort', () => {
	const cloud = { ...base, requiresThinkingParam: true };
	assert.deepEqual(buildThinkingRequestFields(cloud, 'none'), { thinking: { type: 'disabled' } });
});

test('a generic OpenAI model sends only the effort', () => {
	assert.deepEqual(buildThinkingRequestFields(base, 'high'), { reasoning_effort: 'high' });
});

test('a generic OpenAI model sends nothing when thinking is off', () => {
	assert.deepEqual(buildThinkingRequestFields(base, 'none'), {});
});

test('a model without thinking capability sends nothing', () => {
	const plain = { ...base, capabilities: { ...base.capabilities, thinking: false as const } };
	assert.deepEqual(buildThinkingRequestFields(plain, 'high'), {});
});
