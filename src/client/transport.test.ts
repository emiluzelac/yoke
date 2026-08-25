import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_REQUEST_TIMEOUT_MS, normalizeTimeoutMs } from './transport';

test('the default is fifteen minutes, well past a long local prefill', () => {
	assert.equal(DEFAULT_REQUEST_TIMEOUT_MS, 900_000);
	assert.ok(DEFAULT_REQUEST_TIMEOUT_MS > 300_000, 'must exceed undici’s 5-minute body timeout');
});

test('an unset value falls back to the default', () => {
	assert.equal(normalizeTimeoutMs(undefined), DEFAULT_REQUEST_TIMEOUT_MS);
	assert.equal(normalizeTimeoutMs(null), DEFAULT_REQUEST_TIMEOUT_MS);
});

test('a malformed value falls back rather than disabling the guard', () => {
	assert.equal(normalizeTimeoutMs('600000'), DEFAULT_REQUEST_TIMEOUT_MS);
	assert.equal(normalizeTimeoutMs(Number.NaN), DEFAULT_REQUEST_TIMEOUT_MS);
	assert.equal(normalizeTimeoutMs(Number.POSITIVE_INFINITY), DEFAULT_REQUEST_TIMEOUT_MS);
	assert.equal(normalizeTimeoutMs(-1), DEFAULT_REQUEST_TIMEOUT_MS);
});

test('zero disables the guard', () => {
	assert.equal(normalizeTimeoutMs(0), 0);
});

test('a configured value is honoured and floored to whole milliseconds', () => {
	assert.equal(normalizeTimeoutMs(1_800_000), 1_800_000);
	assert.equal(normalizeTimeoutMs(1234.9), 1234);
});
