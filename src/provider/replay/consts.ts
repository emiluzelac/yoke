import { BUILTIN_MODELS } from '../../consts';
import { getModels } from '../../models/registry';

export const REPLAY_MARKER_MIME = 'stateful_marker';
export const REPLAY_MARKER_WRITER_ID = 'yoke';
/**
 * Marker prefix written before the Yoke rename. Still present in chat
 * transcripts a migrating user carries over, so it stays accepted on read.
 */
export const LEGACY_REPLAY_MARKER_WRITER_ID = 'deepseek-copilot';

/**
 * Marker prefixes accepted on read. Computed per call because the model list is
 * now runtime configuration. Built-ins stay included so markers written before a
 * `customModels` block was configured keep resolving.
 */
export function getReplayMarkerPrefixes(): Set<string> {
	return new Set([
		REPLAY_MARKER_WRITER_ID,
		LEGACY_REPLAY_MARKER_WRITER_ID,
		...BUILTIN_MODELS.map((model) => model.id),
		...getModels().map((model) => model.id),
	]);
}
export const ENCODED_JSON_MARKER_PREFIX = 'json:';
export const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
export const LEGACY_SEGMENT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
