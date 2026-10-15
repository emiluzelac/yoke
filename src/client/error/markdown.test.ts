import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeBoldText } from './markdown';

test('error summaries escape asterisks used as bold delimiters', () => {
	assert.equal(escapeBoldText('an *unexpected* error'), 'an \\*unexpected\\* error');
});

test('backslashes cannot cancel escaping of an adjacent asterisk', () => {
	assert.equal(escapeBoldText(String.raw`C:\models\*local*`), String.raw`C:\\models\\\*local\*`);
});

test('existing escape characters remain literal, including a trailing backslash', () => {
	assert.equal(escapeBoldText('path\\'), 'path\\\\');
	assert.equal(escapeBoldText('ordinary error'), 'ordinary error');
	assert.equal(escapeBoldText(''), '');
});
