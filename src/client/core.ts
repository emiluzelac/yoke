import type { CancellationToken } from 'vscode';
import { buildAuthHeaders } from '../endpoint';
import { safeStringify } from '../json';
import { logger } from '../logger';
import type {
	DeepSeekRequest,
	DeepSeekStreamChunk,
	DeepSeekUsage,
	StreamCallbacks,
} from '../types';
import { createStreamDispatchState, dispatchStreamChunk, flushPendingToolCalls } from './dispatch';
import { createHttpError, formatRequestError, normalizeRequestError } from './error';
import { DEFAULT_REQUEST_TIMEOUT_MS, openChatStream, readAllText, readChunks } from './transport';

/**
 * Lightweight SSE-streaming DeepSeek API client.
 * No external dependencies — uses Node's built-in http/https.
 */
export class DeepSeekClient {
	constructor(
		private readonly baseUrl: string,
		private readonly apiKey: string | undefined,
		private readonly idleTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
	) {}

	/**
	 * Stream a chat completion from the DeepSeek API.
	 * Parses SSE chunks and dispatches callbacks for content, thinking, and tool calls.
	 */
	async streamChatCompletion(
		request: DeepSeekRequest,
		callbacks: StreamCallbacks,
		cancellationToken?: CancellationToken,
	): Promise<void> {
		const controller = new AbortController();
		const cancelListener = cancellationToken?.onCancellationRequested(() => {
			controller.abort();
		});
		if (cancellationToken?.isCancellationRequested) {
			controller.abort();
		}

		try {
			// Request usage stats in streaming responses so we can calibrate token counting.
			const requestBody = {
				...request,
				stream_options: { include_usage: true },
			};

			const response = await openChatStream({
				url: `${this.baseUrl}/chat/completions`,
				headers: buildAuthHeaders(this.apiKey),
				body: safeStringify(requestBody),
				idleTimeoutMs: this.idleTimeoutMs,
				signal: controller.signal,
			});

			if (response.status < 200 || response.status >= 300) {
				const errorBody = await readAllText(response.body);
				throw await createHttpError(
					new Response(errorBody, { status: response.status, statusText: response.statusText }),
					{ baseUrl: this.baseUrl, request },
				);
			}

			const decoder = new TextDecoder();
			let buffer = '';
			const state = createStreamDispatchState();

			for await (const chunk of readChunks(response.body)) {
				if (cancellationToken?.isCancellationRequested) {
					controller.abort();
					return;
				}

				buffer += decoder.decode(chunk, { stream: true });

				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();

					if (!trimmed || trimmed.startsWith(':')) {
						continue;
					}

					if (trimmed === 'data: [DONE]') {
						flushPendingToolCalls(state, callbacks);
						reportFinalUsage(callbacks, state.latestUsage);
						callbacks.onDone();
						return;
					}

					if (!trimmed.startsWith('data: ')) {
						continue;
					}

					const jsonStr = trimmed.slice(6);
					try {
						dispatchStreamChunk(JSON.parse(jsonStr) as DeepSeekStreamChunk, state, callbacks);
					} catch (e) {
						logger.error('Failed to parse SSE chunk:', jsonStr.slice(0, 200), e);
					}
				}
			}

			reportFinalUsage(callbacks, state.latestUsage);
			callbacks.onDone();
		} catch (error) {
			if (isAbortError(error) && cancellationToken?.isCancellationRequested) {
				return;
			}
			const normalizedError = normalizeRequestError(error, { baseUrl: this.baseUrl, request });
			logger.error('DeepSeek request failed:', formatRequestError(normalizedError));
			callbacks.onError(normalizedError);
		} finally {
			cancelListener?.dispose();
		}
	}
}

function reportFinalUsage(callbacks: StreamCallbacks, usage: DeepSeekUsage | undefined): void {
	if (!usage || !callbacks.onUsage) {
		return;
	}
	callbacks.onUsage(usage);
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}
