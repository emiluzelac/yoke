export const OFFICIAL_DEEPSEEK_API_HOST = 'api.deepseek.com';

export function isOfficialDeepSeekBaseUrl(baseUrl: string): boolean {
	try {
		return new URL(baseUrl).hostname.toLowerCase() === OFFICIAL_DEEPSEEK_API_HOST;
	} catch {
		return false;
	}
}

export function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/u, '');
}

/**
 * Whether the endpoint demands an API key before a request is worth attempting.
 *
 * Only the official DeepSeek host does. Pointing `baseUrl` at anything else is
 * treated as an unambiguous signal of a self-hosted or proxied deployment, which
 * commonly accepts unauthenticated requests. A key is still sent whenever one is
 * configured — see `buildAuthHeaders`.
 */
export function isApiKeyRequired(baseUrl: string): boolean {
	return isOfficialDeepSeekBaseUrl(normalizeBaseUrl(baseUrl));
}

/** Request headers for a chat completion, omitting auth when no key is set. */
export function buildAuthHeaders(apiKey: string | undefined): Record<string, string> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey?.trim()) {
		headers.Authorization = `Bearer ${apiKey.trim()}`;
	}
	return headers;
}
