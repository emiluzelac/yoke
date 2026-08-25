import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	FIRST_BACKOFF_MS,
	MAX_BACKOFF_MS,
	SUCCESS_INTERVAL_MS,
	backoffMs,
	createSchedule,
	recordFailure,
	recordSuccess,
	shouldAttempt,
	shouldWarn,
} from './schedule';

test('a fresh schedule attempts immediately', () => {
	assert.equal(shouldAttempt(createSchedule(), 0), true);
});

test('a success is trusted for the success interval', () => {
	const state = recordSuccess(1_000);
	assert.equal(shouldAttempt(state, 1_000 + SUCCESS_INTERVAL_MS - 1), false);
	assert.equal(shouldAttempt(state, 1_000 + SUCCESS_INTERVAL_MS), true);
});

test('backoff doubles per consecutive failure', () => {
	assert.equal(backoffMs(1), FIRST_BACKOFF_MS);
	assert.equal(backoffMs(2), FIRST_BACKOFF_MS * 2);
	assert.equal(backoffMs(3), FIRST_BACKOFF_MS * 4);
});

test('backoff is capped, including at absurd failure counts', () => {
	assert.equal(backoffMs(999), MAX_BACKOFF_MS);
	assert.ok(backoffMs(50) <= MAX_BACKOFF_MS);
});

test('repeated reads during a backoff window do not attempt', () => {
	// The regression this exists for: eleven fetches in seventeen seconds.
	let state = recordFailure(createSchedule(), 0);
	let attempts = 0;
	for (let now = 0; now < 17_000; now += 1_500) {
		if (shouldAttempt(state, now)) {
			attempts++;
			state = recordFailure(state, now);
		}
	}
	assert.ok(attempts <= 3, `expected at most 3 attempts in 17s, got ${attempts}`);
});

test('only the first failure of a streak warns', () => {
	const first = createSchedule();
	assert.equal(shouldWarn(first), true);
	const second = recordFailure(first, 0);
	assert.equal(shouldWarn(second), false);
	assert.equal(shouldWarn(recordFailure(second, 10_000)), false);
});

test('recovery re-arms the warning for the next outage', () => {
	const failed = recordFailure(createSchedule(), 0);
	assert.equal(shouldWarn(failed), false);
	assert.equal(shouldWarn(recordSuccess(1_000)), true);
});
