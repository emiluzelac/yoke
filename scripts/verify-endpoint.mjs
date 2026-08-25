#!/usr/bin/env node
/**
 * Probe an OpenAI-compatible endpoint and report whether Yoke can drive it.
 *
 * Standalone on purpose: Node built-ins only, no build step, no dependencies. Run it
 * before filing a bug so the answer to "does my server work with this?" is evidence
 * rather than guesswork. Finishes by printing a ready-to-paste settings block with
 * the context window read off the server.
 *
 *   node scripts/verify-endpoint.mjs http://127.0.0.1:8888/v1
 *   node scripts/verify-endpoint.mjs https://api.deepseek.com --key sk-...
 *   node scripts/verify-endpoint.mjs http://127.0.0.1:8888/v1 --model my-model-id
 */

const RESET = '\x1b[0m';
const paint = (code, text) => (process.stdout.isTTY ? `${code}${text}${RESET}` : text);
const green = (t) => paint('\x1b[32m', t);
const red = (t) => paint('\x1b[31m', t);
const yellow = (t) => paint('\x1b[33m', t);
const dim = (t) => paint('\x1b[2m', t);

let failures = 0;
let warnings = 0;

function pass(label, detail) {
	console.log(`  ${green('PASS')}  ${label}${detail ? dim(' — ' + detail) : ''}`);
}
function fail(label, detail) {
	failures++;
	console.log(`  ${red('FAIL')}  ${label}${detail ? dim(' — ' + detail) : ''}`);
}
function warn(label, detail) {
	warnings++;
	console.log(`  ${yellow('WARN')}  ${label}${detail ? dim(' — ' + detail) : ''}`);
}
function info(label, detail) {
	console.log(`  ${dim('····')}  ${label}${detail ? dim(' — ' + detail) : ''}`);
}

function parseArgs(argv) {
	const args = { baseUrl: undefined, model: undefined, key: undefined };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--key') {
			args.key = argv[++i];
		} else if (arg === '--model') {
			args.model = argv[++i];
		} else if (arg === '--help' || arg === '-h') {
			args.help = true;
		} else if (!args.baseUrl) {
			args.baseUrl = arg;
		}
	}
	return args;
}

function normalizeBaseUrl(baseUrl) {
	return baseUrl.trim().replace(/\/+$/u, '');
}

function isOfficialDeepSeek(baseUrl) {
	try {
		return new URL(baseUrl).hostname.toLowerCase() === 'api.deepseek.com';
	} catch {
		return false;
	}
}

function authHeaders(key) {
	const headers = { 'Content-Type': 'application/json' };
	if (key?.trim()) {
		headers.Authorization = `Bearer ${key.trim()}`;
	}
	return headers;
}

async function fetchWithTimeout(url, options, ms = 30000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

/** Stream one completion and report which fields the server actually used. */
async function probeStream(baseUrl, key, body) {
	const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: authHeaders(key),
		body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true } }),
	}, 180000);

	if (!response.ok) {
		return { ok: false, status: response.status, error: (await response.text()).slice(0, 300) };
	}

	const result = {
		ok: true,
		status: response.status,
		content: '',
		reasoningField: undefined,
		reasoning: '',
		toolCalls: new Map(),
		usage: undefined,
	};

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	outer: while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith(':')) continue;
			if (trimmed === 'data: [DONE]') break outer;
			if (!trimmed.startsWith('data: ')) continue;

			let chunk;
			try {
				chunk = JSON.parse(trimmed.slice(6));
			} catch {
				continue;
			}

			if (chunk.usage) result.usage = chunk.usage;
			const delta = chunk.choices?.[0]?.delta;
			if (!delta) continue;

			if (delta.reasoning_content) {
				result.reasoningField ??= 'reasoning_content';
				result.reasoning += delta.reasoning_content;
			} else if (delta.reasoning) {
				result.reasoningField ??= 'reasoning';
				result.reasoning += delta.reasoning;
			}
			if (delta.content) result.content += delta.content;

			for (const call of delta.tool_calls ?? []) {
				const pending = result.toolCalls.get(call.index) ?? { name: '', arguments: '' };
				pending.name += call.function?.name ?? '';
				pending.arguments += call.function?.arguments ?? '';
				result.toolCalls.set(call.index, pending);
			}
		}
	}

	return result;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.help || !args.baseUrl) {
		console.log(`
Probe an OpenAI-compatible endpoint for Yoke compatibility.

  node scripts/verify-endpoint.mjs <baseUrl> [--model <id>] [--key <apiKey>]

Examples:
  node scripts/verify-endpoint.mjs http://127.0.0.1:8888/v1
  node scripts/verify-endpoint.mjs http://127.0.0.1:8888/v1 --model deepseek-v4-flash-0731
  node scripts/verify-endpoint.mjs https://api.deepseek.com --key sk-...
`);
		process.exit(args.help ? 0 : 1);
	}

	const baseUrl = normalizeBaseUrl(args.baseUrl);
	console.log(`\nYoke endpoint check\n${dim(baseUrl)}\n`);

	// --- 1. model discovery ---
	console.log('[1] Model discovery');
	let chosen;
	let maxModelLen;
	try {
		const response = await fetchWithTimeout(`${baseUrl}/models`, { headers: authHeaders(args.key) }, 15000);
		if (!response.ok) {
			fail(`GET /models returned HTTP ${response.status}`, 'Yoke does not need this endpoint, but it is the easiest way to find your model id');
		} else {
			const data = await response.json();
			const models = Array.isArray(data.data) ? data.data : [];
			pass(`GET /models listed ${models.length} model(s)`);
			for (const model of models) {
				const len = model.max_model_len ? `max_model_len ${model.max_model_len}` : '';
				info(model.id, len);
			}
			chosen = models.find((m) => m.id === args.model) ?? models.find((m) => m.id !== 'llm') ?? models[0];
			maxModelLen = chosen?.max_model_len;
		}
	} catch (error) {
		fail('could not reach the endpoint', error.message);
		console.log(`\n${red('Endpoint unreachable — nothing else can be checked.')}\n`);
		process.exit(1);
	}

	const modelId = args.model ?? chosen?.id;
	if (!modelId) {
		fail('no model id', 'pass one with --model');
		process.exit(1);
	}
	info('using model', modelId);

	// --- 2. authentication ---
	console.log('\n[2] Authentication');
	const official = isOfficialDeepSeek(baseUrl);
	if (official) {
		pass('official DeepSeek host — Yoke will require an API key');
		if (!args.key) warn('no --key given', 'the remaining checks will likely fail with HTTP 401');
	} else {
		const anon = await probeStream(baseUrl, undefined, {
			model: modelId,
			messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
			max_tokens: 8,
		});
		if (anon.ok) {
			pass('accepts unauthenticated requests', 'no API key needed in Yoke');
		} else if (anon.status === 401 || anon.status === 403) {
			warn(`server requires authentication (HTTP ${anon.status})`, 'set your key with the Yoke: Set API Key command');
		} else {
			warn(`unauthenticated probe returned HTTP ${anon.status}`, anon.error);
		}
	}

	// --- 3. streaming, reasoning, usage ---
	console.log('\n[3] Streaming chat');
	const chat = await probeStream(baseUrl, args.key, {
		model: modelId,
		messages: [{ role: 'user', content: 'In one short sentence, what is a compiler?' }],
		max_tokens: 200,
		reasoning_effort: 'high',
	});
	if (!chat.ok) {
		fail(`HTTP ${chat.status}`, chat.error);
	} else {
		pass('streamed a completion');
		if (chat.content) {
			pass('content received', JSON.stringify(chat.content.trim().slice(0, 60)));
		} else {
			fail('no content received');
		}
		if (chat.reasoningField === 'reasoning') {
			pass('reasoning streamed as delta.reasoning', 'Yoke renders this; upstream drops it');
		} else if (chat.reasoningField === 'reasoning_content') {
			pass('reasoning streamed as delta.reasoning_content', 'the DeepSeek API convention');
		} else {
			info('no reasoning emitted', 'a non-reasoning model, or no reasoning parser configured — declare the model without a "thinking" block');
		}
		if (chat.usage?.total_tokens > 0) {
			pass('usage reported', `${chat.usage.prompt_tokens} prompt + ${chat.usage.completion_tokens} completion`);
		} else {
			warn('no usage reported', 'token counts will fall back to a character-based estimate');
		}
	}

	// --- 4. tool calling ---
	console.log('\n[4] Tool calling');
	const tools = await probeStream(baseUrl, args.key, {
		model: modelId,
		messages: [{ role: 'user', content: 'What is the weather in Paris? Use the tool.' }],
		max_tokens: 200,
		tools: [{
			type: 'function',
			function: {
				name: 'get_weather',
				description: 'Get the weather for a city',
				parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
			},
		}],
		tool_choice: 'auto',
	});
	let toolCallingSupported = true;
	if (!tools.ok) {
		// A server without tool support rejects the request outright. That is a
		// capability the settings block should record, not a broken endpoint.
		const rejectsTools = tools.status === 400 && /tool/i.test(tools.error ?? '');
		toolCallingSupported = false;
		if (rejectsTools) {
			warn('server has tool calling disabled', 'agent mode will not work; the settings block below sets toolCalling to false');
			info('for vLLM', 'restart with --enable-auto-tool-choice and a --tool-call-parser');
		} else {
			fail(`HTTP ${tools.status}`, tools.error);
		}
	} else if (tools.toolCalls.size > 0) {
		const calls = [...tools.toolCalls.values()].map((c) => `${c.name}(${c.arguments})`).join(', ');
		pass('tool call returned', calls);
	} else {
		warn('no tool call returned', 'the model may have answered directly; agent mode may still work');
	}

	// --- 5. suggested settings ---
	console.log('\n[5] Suggested settings');
	// A self-hosted server shares one budget between prompt and completion, unlike a
	// hosted API that bills them separately. Carve the output budget out of the total
	// instead of declaring both at full size — a quarter of the window, capped, keeps
	// this sane for a 32K model as well as a 1M one.
	const DEFAULT_CONTEXT = 131072;
	const OUTPUT_CAP = 65536;
	const total = maxModelLen ?? DEFAULT_CONTEXT;
	const maxOutputTokens = Math.min(OUTPUT_CAP, Math.max(1024, Math.floor(total / 4)));
	const maxInputTokens = total - maxOutputTokens;
	if (maxModelLen) {
		info('context arithmetic', `${total} total − ${maxOutputTokens} output = ${maxInputTokens} input`);
	} else {
		warn('server did not report max_model_len', `assuming ${DEFAULT_CONTEXT} — set it to your real limit`);
	}

	const entry = {
		id: modelId,
		name: `${modelId} (local)`,
		maxInputTokens,
		maxOutputTokens,
	};
	if (!toolCallingSupported) {
		entry.toolCalling = false;
	}
	if (chat.reasoningField) {
		entry.thinking = { supportedEfforts: ['low', 'high', 'max'], defaultEffort: 'high', canDisable: true };
	}
	console.log('\n' + JSON.stringify({
		'yoke.baseUrl': baseUrl,
		'yoke.customModels': [entry],
	}, null, 2).split('\n').map((l) => '  ' + l).join('\n'));

	console.log(
		`\n${failures === 0 ? green('Endpoint looks compatible.') : red(`${failures} check(s) failed.`)}` +
		`${warnings > 0 ? yellow(` ${warnings} warning(s).`) : ''}\n`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

await main();
