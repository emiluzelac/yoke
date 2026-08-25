import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAuthHeaders, isApiKeyRequired } from './endpoint';

test('the official host requires an API key', () => {
	assert.equal(isApiKeyRequired('https://api.deepseek.com'), true);
	assert.equal(isApiKeyRequired('https://api.deepseek.com/'), true);
	assert.equal(isApiKeyRequired('https://API.DeepSeek.com'), true);
});

test('a self-hosted endpoint does not require an API key', () => {
	assert.equal(isApiKeyRequired('http://127.0.0.1:8888'), false);
	assert.equal(isApiKeyRequired('http://gx10.local:8888/v1'), false);
	assert.equal(isApiKeyRequired('https://llm.example.com/v1'), false);
});

test('a malformed base URL does not demand a key', () => {
	assert.equal(isApiKeyRequired('not a url'), false);
});

test('the key is sent whenever one is present, on any host', () => {
	assert.deepEqual(buildAuthHeaders('sk-abc'), {
		'Content-Type': 'application/json',
		Authorization: 'Bearer sk-abc',
	});
});

test('no Authorization header is sent without a key', () => {
	assert.deepEqual(buildAuthHeaders(undefined), { 'Content-Type': 'application/json' });
	assert.deepEqual(buildAuthHeaders('   '), { 'Content-Type': 'application/json' });
});
