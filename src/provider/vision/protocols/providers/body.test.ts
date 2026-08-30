import assert from 'node:assert/strict';
import Module from 'node:module';
import { test } from 'node:test';
import type { VisionDescriptionRequest, VisionProxyConfig } from '../../types';

// The adapters reach i18n, which imports the `vscode` host module. That module
// only exists inside the extension host, so stand in for the one field i18n
// reads before requiring anything below it.
type Resolver = (this: unknown, request: string, ...rest: unknown[]) => string;
const loader = Module as unknown as { _resolveFilename: Resolver };
const resolveFilename = loader._resolveFilename;
loader._resolveFilename = function (request, ...rest) {
	return request === 'vscode' ? 'vscode' : resolveFilename.call(this, request, ...rest);
};

const stub = new Module('vscode');
stub.exports = { env: { language: 'en' } };
(stub as unknown as { loaded: boolean }).loaded = true;
require.cache.vscode = stub;

const { openAIChatAdapter } = require('./openai/chat') as typeof import('./openai/chat');
const { openAIResponsesAdapter } =
	require('./openai/responses') as typeof import('./openai/responses');
const { anthropicMessagesAdapter } =
	require('./anthropic/messages') as typeof import('./anthropic/messages');
const { DEFAULT_VISION_MAX_OUTPUT_TOKENS } =
	require('../../consts') as typeof import('../../consts');

function createConfig(overrides: Partial<VisionProxyConfig> = {}): VisionProxyConfig {
	return {
		providerFamily: 'openai-compatible',
		apiType: 'chat-completions',
		url: 'http://127.0.0.1:8889/v1/chat/completions',
		modelId: 'qwen3-vl-4b',
		updatedAt: 0,
		...overrides,
	};
}

const request: VisionDescriptionRequest = {
	prompt: 'Describe all image attachments in this message.',
	images: [{ mimeType: 'image/png', data: new Uint8Array([1, 2, 3]) }],
	token: { isCancellationRequested: false } as VisionDescriptionRequest['token'],
};

// A describe call with no output cap lets the server fall back to whatever is
// left of its context window. On a self-hosted lane that is tens of thousands
// of tokens, which outlives the client timeout and surfaces as a bogus network
// TIMEOUT instead of a description.
test('chat-completions bounds the description length', () => {
	const body = openAIChatAdapter.createBody(createConfig(), request) as Record<string, unknown>;
	assert.equal(body.max_tokens, DEFAULT_VISION_MAX_OUTPUT_TOKENS);
});

test('responses bounds the description length', () => {
	const config = createConfig({ apiType: 'responses' });
	const body = openAIResponsesAdapter.createBody(config, request) as Record<string, unknown>;
	assert.equal(body.max_output_tokens, DEFAULT_VISION_MAX_OUTPUT_TOKENS);
});

test('anthropic bounds the description length', () => {
	const config = createConfig({ providerFamily: 'anthropic-compatible', apiType: 'messages' });
	const body = anthropicMessagesAdapter.createBody(config, request) as Record<string, unknown>;
	assert.equal(body.max_tokens, DEFAULT_VISION_MAX_OUTPUT_TOKENS);
});

test('extraBody still overrides the default cap', () => {
	const config = createConfig({ extraBody: { max_tokens: 4096, temperature: 0.2 } });
	const body = openAIChatAdapter.createBody(config, request) as Record<string, unknown>;
	assert.equal(body.max_tokens, 4096);
	assert.equal(body.temperature, 0.2);
});

test('extraBody cannot displace the model or the messages', () => {
	const config = createConfig({ extraBody: { model: 'somebody-else', messages: [] } });
	const body = openAIChatAdapter.createBody(config, request) as Record<string, unknown>;
	assert.equal(body.model, 'qwen3-vl-4b');
	assert.equal((body.messages as unknown[]).length, 1);
});
