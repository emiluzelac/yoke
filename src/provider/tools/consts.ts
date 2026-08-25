// DeepSeek Chat Completions API: "A max of 128 functions are supported."
// https://api-docs.deepseek.com/api/create-chat-completion#:~:text=A%20max%20of%20128%20functions%20are%20supported.
export const DEEPSEEK_TOOLS_LIMIT = 128;

export const ACTIVATE_TOOL_PREFIX = 'activate_';
export const PREFLIGHT_ACTIVATE_CALL_ID_PREFIX = 'deepseek_preflight_activate_';
export const MAX_PREFLIGHT_ROUNDS_PER_USER_REQUEST = 3;

export const TOOL_DRIFT_NOTICE_START = '[yoke-tool-drift-notice-start]: #';
export const TOOL_DRIFT_NOTICE_END = '[yoke-tool-drift-notice-end]: #';
export const VISION_PROXY_NOTICE_START = '[yoke-vision-proxy-notice-start]: #';
export const VISION_PROXY_NOTICE_END = '[yoke-vision-proxy-notice-end]: #';

/**
 * Notice markers written before the Yoke rename.
 *
 * These literals are embedded in chat transcripts the provider re-parses on later
 * turns, so a migrating user's history still contains them. They must stay
 * accepted on read even though nothing writes them any more.
 */
export const LEGACY_TOOL_DRIFT_NOTICE_START = '[deepseek-copilot-tool-drift-notice-start]: #';
export const LEGACY_TOOL_DRIFT_NOTICE_END = '[deepseek-copilot-tool-drift-notice-end]: #';
export const LEGACY_VISION_PROXY_NOTICE_START = '[deepseek-copilot-vision-proxy-notice-start]: #';
export const LEGACY_VISION_PROXY_NOTICE_END = '[deepseek-copilot-vision-proxy-notice-end]: #';

/** Every marker pair stripped from replayed assistant text, newest first. */
export const NOTICE_MARKER_PAIRS: readonly { start: string; end: string }[] = [
	{ start: TOOL_DRIFT_NOTICE_START, end: TOOL_DRIFT_NOTICE_END },
	{ start: VISION_PROXY_NOTICE_START, end: VISION_PROXY_NOTICE_END },
	{ start: LEGACY_TOOL_DRIFT_NOTICE_START, end: LEGACY_TOOL_DRIFT_NOTICE_END },
	{ start: LEGACY_VISION_PROXY_NOTICE_START, end: LEGACY_VISION_PROXY_NOTICE_END },
];
