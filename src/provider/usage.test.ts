import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCacheHitRate, getCacheStats } from './usage';

test('DeepSeek hit/miss fields are read as-is', () => {
	const stats = getCacheStats({
		prompt_tokens: 1000,
		completion_tokens: 10,
		total_tokens: 1010,
		prompt_cache_hit_tokens: 900,
		prompt_cache_miss_tokens: 100,
	});
	assert.deepEqual(stats, { hit: 900, miss: 100, reported: true });
	assert.equal(formatCacheHitRate(stats), '90');
});

test('OpenAI-style cached_tokens (vLLM, SGLang) implies the miss count from prompt_tokens', () => {
	const stats = getCacheStats({
		prompt_tokens: 22684,
		completion_tokens: 2,
		total_tokens: 22686,
		prompt_tokens_details: { cached_tokens: 22528 },
	});
	assert.deepEqual(stats, { hit: 22528, miss: 156, reported: true });
	assert.equal(formatCacheHitRate(stats), '99');
});

test('a reported zero cache is 0%, not n/a', () => {
	const stats = getCacheStats({
		prompt_tokens: 45,
		completion_tokens: 2,
		total_tokens: 47,
		prompt_tokens_details: { cached_tokens: 0, multimodal_tokens: null },
	});
	assert.deepEqual(stats, { hit: 0, miss: 45, reported: true });
	assert.equal(formatCacheHitRate(stats), '0');
});

test('no cache fields at all is n/a', () => {
	const stats = getCacheStats({ prompt_tokens: 45, completion_tokens: 2, total_tokens: 47 });
	assert.deepEqual(stats, { hit: 0, miss: 0, reported: false });
	assert.equal(formatCacheHitRate(stats), 'n/a');
});

test('a null cached_tokens counts as not reported', () => {
	const stats = getCacheStats({
		prompt_tokens: 45,
		completion_tokens: 2,
		total_tokens: 47,
		prompt_tokens_details: { cached_tokens: null },
	});
	assert.equal(stats.reported, false);
	assert.equal(formatCacheHitRate(stats), 'n/a');
});

test('DeepSeek fields win when both shapes are present', () => {
	const stats = getCacheStats({
		prompt_tokens: 100,
		completion_tokens: 1,
		total_tokens: 101,
		prompt_cache_hit_tokens: 64,
		prompt_cache_miss_tokens: 36,
		prompt_tokens_details: { cached_tokens: 0 },
	});
	assert.deepEqual(stats, { hit: 64, miss: 36, reported: true });
});

test('cached_tokens larger than prompt_tokens never yields a negative miss', () => {
	const stats = getCacheStats({
		prompt_tokens: 10,
		completion_tokens: 1,
		total_tokens: 11,
		prompt_tokens_details: { cached_tokens: 16 },
	});
	assert.deepEqual(stats, { hit: 16, miss: 0, reported: true });
});
