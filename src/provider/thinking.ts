import type { DeepSeekRequest, ModelDefinition } from '../types';
import type { ThinkingEffort } from './models';

/**
 * Build the thinking-related request fields for a model.
 *
 * `thinking: {type}` is DeepSeek's own extension. It is meaningless to a generic
 * OpenAI-compatible server and a strict gateway can reject the unknown field, so
 * it is sent only when the model declares `requiresThinkingParam`. Measurement
 * against vLLM showed `reasoning_effort` alone drives thinking there, while
 * `thinking: {type}` alone did nothing — so omitting it costs no behavior.
 */
export function buildThinkingRequestFields(
	modelDef: ModelDefinition,
	effort: ThinkingEffort,
): Pick<DeepSeekRequest, 'thinking' | 'reasoning_effort'> {
	if (!modelDef.capabilities.thinking) {
		return {};
	}

	return {
		...(modelDef.requiresThinkingParam
			? { thinking: { type: effort === 'none' ? ('disabled' as const) : ('enabled' as const) } }
			: {}),
		...(effort === 'none' ? {} : { reasoning_effort: effort }),
	};
}
