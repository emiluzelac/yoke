import { logger } from '../logger';
import type { ModelDefinition } from '../types';
import {
	type ScheduleState,
	backoffMs,
	createSchedule,
	recordFailure,
	recordSuccess,
	shouldAttempt,
	shouldWarn,
} from './schedule';
import { parseRegistryPayload } from './validate';

/**
 * Models fetched from a registry, so a fleet of endpoints is described in one
 * place instead of being re-derived by hand in every client.
 *
 * The picker must never wait on the network: `getRemoteModels` returns whatever
 * was last fetched, and `refreshRemoteModels` updates it in the background and
 * calls back only when the set actually changed. Same shape as the existing
 * balance-currency resolver.
 *
 * Refreshes are throttled by `./schedule`, because the provider asks on every
 * picker read and an unreachable registry would otherwise produce a fetch and a
 * log line per read.
 */

const FETCH_TIMEOUT_MS = 4000;

interface RemoteState {
	url: string;
	models: ModelDefinition[];
	fetchedAt: number;
}

let cached: RemoteState | undefined;
let inFlight: Promise<void> | undefined;
let schedule: ScheduleState = createSchedule();
let scheduledUrl: string | undefined;

export function getRemoteModels(url: string | undefined): ModelDefinition[] {
	if (!url || cached?.url !== url) {
		return [];
	}
	return cached.models;
}

/** Clear the cache when the configured registry changes or is removed. */
export function invalidateRemoteModels(): void {
	cached = undefined;
	schedule = createSchedule();
	scheduledUrl = undefined;
}

export function refreshRemoteModels(url: string | undefined, onChanged: () => void): void {
	if (!url || inFlight) {
		return;
	}

	// A new registry address starts with a clean slate rather than inheriting
	// the previous one's backoff.
	if (scheduledUrl !== url) {
		schedule = createSchedule();
		scheduledUrl = url;
	}

	if (!shouldAttempt(schedule, Date.now())) {
		return;
	}

	const refresh = fetchModels(url)
		.then((models) => {
			const previous = cached?.url === url ? cached.models : undefined;
			cached = { url, models, fetchedAt: Date.now() };
			schedule = recordSuccess(Date.now());
			if (!previous || !sameModelSet(previous, models)) {
				logger.info(`Registry ${url} returned ${models.length} model(s)`);
				onChanged();
			}
		})
		.catch((error) => {
			// A registry that is down must not take the picker with it: the last
			// known good set stays cached and the configured models remain the
			// fallback underneath it. Only the first failure of a streak is
			// logged; the rest would say the same thing.
			const announce = shouldWarn(schedule);
			schedule = recordFailure(schedule, Date.now());
			if (announce) {
				const retryIn = Math.round(backoffMs(schedule.failures) / 1000);
				logger.warn(
					`Registry ${url} unreachable, using last known models — retrying in ${retryIn}s`,
					error,
				);
			}
		})
		.finally(() => {
			if (inFlight === refresh) {
				inFlight = undefined;
			}
		});

	inFlight = refresh;
}

async function fetchModels(url: string): Promise<ModelDefinition[]> {
	const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	const { models, problems } = parseRegistryPayload(await response.json());
	for (const problem of problems) {
		logger.warn(`Ignoring registry entry — ${problem}`);
	}
	return models;
}

function sameModelSet(a: readonly ModelDefinition[], b: readonly ModelDefinition[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const key = (m: ModelDefinition) => `${m.id}:${m.maxInputTokens}:${m.maxOutputTokens}:${m.name}`;
	const left = a.map(key).sort();
	const right = b.map(key).sort();
	return left.every((value, index) => value === right[index]);
}
