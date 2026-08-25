import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBaseUrl } from './endpoint';

test('test harness runs against compiled output', () => {
	assert.equal(normalizeBaseUrl('http://127.0.0.1:8888/'), 'http://127.0.0.1:8888');
});
