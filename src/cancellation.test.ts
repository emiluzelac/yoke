import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCancellationError } from './cancellation';

function named(name: string, message = 'boom'): Error {
	const error = new Error(message);
	error.name = name;
	return error;
}

test('recognises how VS Code spells cancellation', () => {
	assert.equal(isCancellationError(named('Canceled', 'Canceled')), true);
	// the message alone carries it in some hosts
	assert.equal(isCancellationError(new Error('Canceled')), true);
});

test('recognises the Node and fetch spellings', () => {
	assert.equal(isCancellationError(named('AbortError')), true);
	assert.equal(isCancellationError(named('CancellationError')), true);
	assert.equal(isCancellationError(named('Cancelled')), true);
});

test('a genuine failure is not treated as cancellation', () => {
	assert.equal(isCancellationError(named('TypeError', 'terminated')), false);
	assert.equal(isCancellationError(new Error('ECONNREFUSED')), false);
});

test('non-errors are not cancellations', () => {
	assert.equal(isCancellationError(undefined), false);
	assert.equal(isCancellationError('Canceled'), false);
	assert.equal(isCancellationError({ name: 'Canceled' }), false);
});
