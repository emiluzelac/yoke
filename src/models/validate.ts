import { DEEPSEEK_TOOLS_LIMIT } from '../provider/tools/consts';
import type { ModelDefinition, ReasoningEffort, ThinkingCapability } from '../types';

/**
 * Validate the `customModels` setting into model definitions.
 *
 * Pure by design — no VS Code imports — so it is directly unit-testable and so a
 * malformed settings block can never throw into the model picker. Invalid entries
 * are dropped and described in `problems`; the caller decides what to do with them.
 */

const KNOWN_EFFORTS: readonly ReasoningEffort[] = ['low', 'high', 'max'];

export interface CustomModelValidation {
	models: ModelDefinition[];
	problems: string[];
}

export function validateCustomModels(raw: unknown): CustomModelValidation {
	if (raw === undefined || raw === null) {
		return { models: [], problems: [] };
	}
	if (!Array.isArray(raw)) {
		return { models: [], problems: ['customModels must be an array'] };
	}

	const models: ModelDefinition[] = [];
	const problems: string[] = [];
	const seen = new Set<string>();

	for (const [index, entry] of raw.entries()) {
		const result = validateEntry(entry, `customModels[${index}]`);
		if (typeof result === 'string') {
			problems.push(result);
			continue;
		}
		if (seen.has(result.id)) {
			problems.push(`customModels[${index}]: duplicate id "${result.id}"`);
			continue;
		}
		seen.add(result.id);
		models.push(result);
	}

	return { models, problems };
}

function validateEntry(entry: unknown, label: string): ModelDefinition | string {
	if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
		return `${label}: must be an object`;
	}
	const source = entry as Record<string, unknown>;

	const id = readNonEmptyString(source.id);
	if (!id) {
		return `${label}: id must be a non-empty string`;
	}
	const name = readNonEmptyString(source.name);
	if (!name) {
		return `${label}: name must be a non-empty string`;
	}

	const maxInputTokens = readPositiveInteger(source.maxInputTokens);
	if (maxInputTokens === undefined) {
		return `${label}: maxInputTokens must be a positive integer`;
	}
	const maxOutputTokens = readPositiveInteger(source.maxOutputTokens);
	if (maxOutputTokens === undefined) {
		return `${label}: maxOutputTokens must be a positive integer`;
	}

	const toolCalling = readToolCalling(source.toolCalling);
	if (toolCalling === undefined) {
		return `${label}: toolCalling must be a boolean or a positive integer`;
	}

	const thinking = readThinking(source.thinking, label);
	if (typeof thinking === 'string') {
		return thinking;
	}

	const thinkingParam = source.thinkingParam ?? 'none';
	if (thinkingParam !== 'none' && thinkingParam !== 'deepseek') {
		return `${label}: thinkingParam must be "none" or "deepseek"`;
	}

	return {
		id,
		name,
		family: readNonEmptyString(source.family) ?? 'local',
		version: readNonEmptyString(source.version) ?? '1',
		detail: readNonEmptyString(source.detail) ?? name,
		maxInputTokens,
		maxOutputTokens,
		capabilities: {
			toolCalling,
			imageInput: source.imageInput === undefined ? true : source.imageInput === true,
			nativeImageInput: source.nativeImageInput === true,
			thinking,
		},
		requiresThinkingParam: thinkingParam === 'deepseek',
	};
}

function readThinking(value: unknown, label: string): ThinkingCapability | false | string {
	if (value === undefined || value === null || value === false) {
		return false;
	}
	if (typeof value !== 'object' || Array.isArray(value)) {
		return `${label}: thinking must be an object`;
	}
	const source = value as Record<string, unknown>;

	const rawEfforts = source.supportedEfforts;
	if (!Array.isArray(rawEfforts) || rawEfforts.length === 0) {
		return `${label}: thinking.supportedEfforts must be a non-empty array`;
	}
	const supportedEfforts: ReasoningEffort[] = [];
	for (const effort of rawEfforts) {
		if (!isReasoningEffort(effort)) {
			return `${label}: thinking.supportedEfforts contains an unknown effort ${JSON.stringify(effort)}`;
		}
		supportedEfforts.push(effort);
	}

	const defaultEffort = source.defaultEffort;
	if (!isReasoningEffort(defaultEffort) || !supportedEfforts.includes(defaultEffort)) {
		return `${label}: thinking.defaultEffort must appear in supportedEfforts`;
	}

	return {
		supportedEfforts,
		defaultEffort,
		canDisable: source.canDisable !== false,
	};
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
	return KNOWN_EFFORTS.some((effort) => effort === value);
}

function readNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readToolCalling(value: unknown): boolean | number | undefined {
	if (value === undefined) {
		return DEEPSEEK_TOOLS_LIMIT;
	}
	if (typeof value === 'boolean') {
		return value;
	}
	return readPositiveInteger(value);
}

/** A registry payload is `{ models: [...] }`; entries reuse the customModels rules. */
export function parseRegistryPayload(raw: unknown): {
	models: ModelDefinition[];
	problems: string[];
} {
	if (typeof raw !== 'object' || raw === null) {
		return { models: [], problems: ['registry response was not an object'] };
	}
	const entries = (raw as { models?: unknown }).models;
	if (entries === undefined) {
		return { models: [], problems: ['registry response had no "models" array'] };
	}
	return validateCustomModels(entries);
}
