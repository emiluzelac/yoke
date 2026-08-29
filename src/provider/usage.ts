import type { DeepSeekUsage } from '../types';

export interface CacheStats {
	/** Prompt tokens the server served from its prefix cache. */
	hit: number;
	/** Prompt tokens the server had to prefill. */
	miss: number;
	/** Whether the endpoint reported cache figures at all. */
	reported: boolean;
}

/**
 * Read prompt-cache figures from a usage block.
 *
 * The hosted DeepSeek API reports `prompt_cache_hit_tokens` and
 * `prompt_cache_miss_tokens`. vLLM, SGLang and the OpenAI API report
 * `prompt_tokens_details.cached_tokens` instead, with the miss count implied by
 * `prompt_tokens`. Accept both, so a self-hosted endpoint shows a real hit rate
 * rather than `n/a`.
 */
export function getCacheStats(usage: DeepSeekUsage): CacheStats {
	if (
		typeof usage.prompt_cache_hit_tokens === 'number' ||
		typeof usage.prompt_cache_miss_tokens === 'number'
	) {
		return {
			hit: usage.prompt_cache_hit_tokens ?? 0,
			miss: usage.prompt_cache_miss_tokens ?? 0,
			reported: true,
		};
	}

	const cached = usage.prompt_tokens_details?.cached_tokens;
	if (typeof cached === 'number') {
		return { hit: cached, miss: Math.max(0, usage.prompt_tokens - cached), reported: true };
	}

	return { hit: 0, miss: 0, reported: false };
}

/** Hit rate as a whole-number percentage string, or `n/a` when nothing was reported. */
export function formatCacheHitRate(stats: CacheStats): string {
	const total = stats.hit + stats.miss;
	return stats.reported && total > 0 ? ((stats.hit / total) * 100).toFixed(0) : 'n/a';
}
