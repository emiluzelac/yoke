/**
 * When to retry the registry, and when to say so out loud.
 *
 * `getModels` runs on every picker read, so an unreachable registry used to
 * produce a fetch and a warning per read — eleven of each in seventeen seconds
 * in one real log. That reads like a fault in the extension rather than an
 * endpoint that is simply down.
 *
 * Attempts now back off, and only the first failure of a streak is logged: one
 * line saying it is down and when the next try is, instead of a wall of
 * identical lines. Pure on purpose — no clock, no vscode — so it is testable.
 */

/** How long a good result is trusted before refreshing again. */
export const SUCCESS_INTERVAL_MS = 60_000;
/** Delay after the first failure; doubles per consecutive failure. */
export const FIRST_BACKOFF_MS = 5_000;
/** Ceiling on the backoff, so recovery is still noticed within a few minutes. */
export const MAX_BACKOFF_MS = 300_000;

export interface ScheduleState {
	/** Earliest time another attempt is permitted. */
	readonly nextAttemptAt: number;
	/** Consecutive failures since the last success. */
	readonly failures: number;
}

export function createSchedule(): ScheduleState {
	return { nextAttemptAt: 0, failures: 0 };
}

export function shouldAttempt(state: ScheduleState, now: number): boolean {
	return now >= state.nextAttemptAt;
}

export function recordSuccess(now: number): ScheduleState {
	return { nextAttemptAt: now + SUCCESS_INTERVAL_MS, failures: 0 };
}

export function recordFailure(state: ScheduleState, now: number): ScheduleState {
	const failures = state.failures + 1;
	return { nextAttemptAt: now + backoffMs(failures), failures };
}

export function backoffMs(failures: number): number {
	if (failures < 1) {
		return FIRST_BACKOFF_MS;
	}
	const uncapped = FIRST_BACKOFF_MS * 2 ** (failures - 1);
	// 2 ** large is Infinity, and Math.min handles that correctly.
	return Math.min(uncapped, MAX_BACKOFF_MS);
}

/**
 * Only the first failure of a streak is worth a line. A registry that stays
 * down is not news on every retry.
 */
export function shouldWarn(state: ScheduleState): boolean {
	return state.failures === 0;
}
