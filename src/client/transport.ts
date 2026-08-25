import http from 'node:http';
import https from 'node:https';
import type { Readable } from 'node:stream';

/**
 * HTTP transport for streaming chat completions.
 *
 * Deliberately `node:http` rather than `fetch`. Node's global fetch is undici,
 * which enforces a five-minute body timeout that cannot be raised without a
 * custom dispatcher — and undici is not available to a VS Code extension. That
 * ceiling is a hosted-API assumption: a self-hosted server can spend far longer
 * than five minutes prefilling a long conversation before it emits a single
 * byte, and the request dies mid-prefill with UND_ERR_BODY_TIMEOUT while the
 * GPUs are still working.
 *
 * `node:http` has no body-timeout concept, so the only limit is the socket
 * inactivity guard set here, which the user controls.
 */

/** Fifteen minutes: long enough to prefill a very long conversation on a local server. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 900_000;

export interface ChatStreamResponse {
	status: number;
	statusText: string;
	body: Readable;
}

export interface OpenChatStreamOptions {
	url: string;
	headers: Record<string, string>;
	body: string;
	/** Socket inactivity limit in milliseconds. `0` disables the guard entirely. */
	idleTimeoutMs: number;
	signal: AbortSignal;
}

/**
 * Resolve a configured timeout into milliseconds.
 *
 * Anything not a finite, non-negative number falls back to the default, so a
 * malformed setting slows nothing down and breaks nothing.
 */
export function normalizeTimeoutMs(raw: unknown): number {
	if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
		return DEFAULT_REQUEST_TIMEOUT_MS;
	}
	return Math.floor(raw);
}

export function openChatStream(options: OpenChatStreamOptions): Promise<ChatStreamResponse> {
	return new Promise<ChatStreamResponse>((resolve, reject) => {
		let responseStarted = false;
		const target = new URL(options.url);
		const transport = target.protocol === 'https:' ? https : http;

		const request = transport.request(
			target,
			{
				method: 'POST',
				headers: {
					...options.headers,
					'Content-Length': String(Buffer.byteLength(options.body)),
				},
			},
			(response) => {
				responseStarted = true;
				resolve({
					status: response.statusCode ?? 0,
					statusText: response.statusMessage ?? '',
					body: response,
				});
			},
		);

		if (options.idleTimeoutMs > 0) {
			// Inactivity, not total duration: a silent prefill is expected, a dead
			// socket is not. ETIMEDOUT reuses the existing network error mapping.
			request.setTimeout(options.idleTimeoutMs, () => {
				request.destroy(
					Object.assign(new Error(`No response for ${options.idleTimeoutMs}ms`), {
						code: 'ETIMEDOUT',
					}),
				);
			});
		}

		request.on('error', (error) => {
			// Once headers land the caller owns the stream, and failures surface there.
			if (responseStarted) {
				return;
			}
			reject(wrapTransportError(error));
		});

		const abort = () => {
			request.destroy(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));
		};
		if (options.signal.aborted) {
			abort();
		} else {
			options.signal.addEventListener('abort', abort, { once: true });
		}

		request.write(options.body);
		request.end();
	});
}

/** Iterate a response body, preserving the error shape the diagnostics expect. */
export async function* readChunks(body: Readable): AsyncGenerator<Buffer> {
	try {
		for await (const chunk of body) {
			yield chunk as Buffer;
		}
	} catch (error) {
		throw wrapTransportError(error);
	}
}

/** Read a whole body as text. Used for error responses, which are small. */
export async function readAllText(body: Readable): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of body) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks).toString('utf8');
}

/**
 * `node:http` reports failures as a bare Error carrying `code`, while the
 * diagnostics read `error.cause`. Re-throwing with the original as the cause
 * keeps ECONNREFUSED, ETIMEDOUT and friends classified as before.
 */
function wrapTransportError(error: unknown): Error {
	if (error instanceof Error && error.name === 'AbortError') {
		return error;
	}
	const message = error instanceof Error ? error.message : String(error);
	return new Error(message, { cause: error });
}
