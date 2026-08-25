import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTICE_MARKER_PAIRS } from './consts';

test('notices written before the Yoke rename are still stripped', () => {
	const starts = NOTICE_MARKER_PAIRS.map((pair) => pair.start);
	assert.ok(starts.includes('[deepseek-copilot-tool-drift-notice-start]: #'));
	assert.ok(starts.includes('[deepseek-copilot-vision-proxy-notice-start]: #'));
});

test('current notices are stripped', () => {
	const starts = NOTICE_MARKER_PAIRS.map((pair) => pair.start);
	assert.ok(starts.includes('[yoke-tool-drift-notice-start]: #'));
	assert.ok(starts.includes('[yoke-vision-proxy-notice-start]: #'));
});

test('every pair has a matching end marker', () => {
	for (const pair of NOTICE_MARKER_PAIRS) {
		assert.equal(pair.start.replace('-start]', '-end]'), pair.end);
	}
});
