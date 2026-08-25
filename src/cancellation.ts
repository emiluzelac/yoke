/**
 * Cancellation detection, kept free of VS Code imports so it is unit-testable.
 *
 * VS Code signals cancellation with an error whose `name` and `message` are both
 * the literal string `Canceled` (one 'l' — it is not spelled `CancellationError`
 * on the wire). Node and the fetch/undici stack use `AbortError` instead, so both
 * spellings have to be recognised.
 */
const CANCELLATION_NAMES = new Set(['Canceled', 'Cancelled', 'AbortError', 'CancellationError']);

export function isCancellationError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return CANCELLATION_NAMES.has(error.name) || CANCELLATION_NAMES.has(error.message);
}
