import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStreamDispatchState, dispatchStreamChunk } from './dispatch';
import type { DeepSeekStreamChunk, DeepSeekToolCall, StreamCallbacks } from '../types';

function collect() {
	const thinking: string[] = [];
	const content: string[] = [];
	const toolCalls: DeepSeekToolCall[] = [];
	const callbacks: StreamCallbacks = {
		onThinking: (text) => thinking.push(text),
		onContent: (text) => content.push(text),
		onToolCall: (call) => toolCalls.push(call),
		onError: () => {},
		onDone: () => {},
	};
	return { thinking, content, toolCalls, callbacks };
}

function chunk(delta: Record<string, unknown>, finishReason: string | null = null) {
	return {
		id: 'c1',
		object: 'chat.completion.chunk',
		created: 0,
		model: 'm',
		choices: [{ index: 0, delta, finish_reason: finishReason }],
	} as unknown as DeepSeekStreamChunk;
}

test('dispatches DeepSeek cloud reasoning_content', () => {
	const { thinking, callbacks } = collect();
	dispatchStreamChunk(
		chunk({ reasoning_content: 'cloud' }),
		createStreamDispatchState(),
		callbacks,
	);
	assert.deepEqual(thinking, ['cloud']);
});

test('dispatches vLLM reasoning', () => {
	const { thinking, callbacks } = collect();
	dispatchStreamChunk(chunk({ reasoning: 'local' }), createStreamDispatchState(), callbacks);
	assert.deepEqual(thinking, ['local']);
});

test('prefers reasoning_content when a server sends both', () => {
	const { thinking, callbacks } = collect();
	dispatchStreamChunk(
		chunk({ reasoning_content: 'cloud', reasoning: 'local' }),
		createStreamDispatchState(),
		callbacks,
	);
	assert.deepEqual(thinking, ['cloud']);
});

test('passes ordinary content through untouched', () => {
	const { content, callbacks } = collect();
	dispatchStreamChunk(chunk({ content: 'hello' }), createStreamDispatchState(), callbacks);
	assert.deepEqual(content, ['hello']);
});

test('accumulates tool call deltas and flushes them on finish', () => {
	const { toolCalls, callbacks } = collect();
	const state = createStreamDispatchState();
	dispatchStreamChunk(
		chunk({ tool_calls: [{ index: 0, id: 't1', function: { name: 'get_', arguments: '{"a"' } }] }),
		state,
		callbacks,
	);
	dispatchStreamChunk(
		chunk({ tool_calls: [{ index: 0, function: { name: 'weather', arguments: ':1}' } }] }),
		state,
		callbacks,
	);
	assert.equal(toolCalls.length, 0);
	dispatchStreamChunk(chunk({}, 'tool_calls'), state, callbacks);
	assert.equal(toolCalls.length, 1);
	assert.equal(toolCalls[0]!.function.name, 'get_weather');
	assert.equal(toolCalls[0]!.function.arguments, '{"a":1}');
});

test('records the latest usage without dispatching it', () => {
	const { callbacks } = collect();
	const state = createStreamDispatchState();
	const usageChunk = {
		...chunk({}),
		usage: { prompt_tokens: 6, completion_tokens: 2, total_tokens: 8 },
	} as DeepSeekStreamChunk;
	dispatchStreamChunk(usageChunk, state, callbacks);
	assert.equal(state.latestUsage?.total_tokens, 8);
});
