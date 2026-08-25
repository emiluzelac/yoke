import type {
	DeepSeekStreamChunk,
	DeepSeekToolCall,
	DeepSeekUsage,
	StreamCallbacks,
} from '../types';

/**
 * Chunk-level SSE dispatch, split out of the client so it is reachable without a
 * live `fetch`. Deliberately free of VS Code and logger imports so it can be unit
 * tested under plain Node.
 */

export interface StreamDispatchState {
	pendingToolCalls: Map<number, DeepSeekToolCall>;
	latestUsage?: DeepSeekUsage;
}

export function createStreamDispatchState(): StreamDispatchState {
	return { pendingToolCalls: new Map() };
}

export function flushPendingToolCalls(
	state: StreamDispatchState,
	callbacks: StreamCallbacks,
): void {
	for (const toolCall of state.pendingToolCalls.values()) {
		callbacks.onToolCall(toolCall);
	}
	state.pendingToolCalls.clear();
}

export function dispatchStreamChunk(
	chunk: DeepSeekStreamChunk,
	state: StreamDispatchState,
	callbacks: StreamCallbacks,
): void {
	// Some OpenAI-compatible providers emit usage on every streaming chunk. Keep
	// only the latest; the caller reports it once when the stream completes.
	if (chunk.usage) {
		state.latestUsage = chunk.usage;
	}

	const choice = chunk.choices?.[0];
	if (!choice) {
		return;
	}

	// DeepSeek's API names this `reasoning_content`; vLLM and SGLang name it
	// `reasoning`. Accept either so thinking renders on self-hosted endpoints.
	const reasoning = choice.delta.reasoning_content ?? choice.delta.reasoning;
	if (reasoning) {
		callbacks.onThinking(reasoning);
	}

	if (choice.delta.content) {
		callbacks.onContent(choice.delta.content);
	}

	if (choice.delta.tool_calls) {
		for (const toolCall of choice.delta.tool_calls) {
			let pending = state.pendingToolCalls.get(toolCall.index);
			if (!pending && toolCall.id) {
				pending = { id: toolCall.id, type: 'function', function: { name: '', arguments: '' } };
				state.pendingToolCalls.set(toolCall.index, pending);
			}
			if (pending) {
				if (toolCall.function?.name) {
					pending.function.name += toolCall.function.name;
				}
				if (toolCall.function?.arguments) {
					pending.function.arguments += toolCall.function.arguments;
				}
			}
		}
	}

	if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
		flushPendingToolCalls(state, callbacks);
	}
}
