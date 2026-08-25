import vscode from 'vscode';
import { BUILTIN_MODELS, CONFIG_SECTION } from '../consts';
import { logger } from '../logger';
import type { ModelDefinition } from '../types';
import { getRemoteModels, refreshRemoteModels } from './remote';
import { validateCustomModels } from './validate';

/**
 * Resolve the models the provider exposes.
 *
 * Returns validated `customModels` when at least one entry is usable, and the
 * built-in cloud models otherwise. Bad settings produce log lines, never an
 * exception and never an empty picker.
 *
 * Configuration is read per call rather than cached: the two call sites (picker
 * refresh, request preparation) are infrequent, and caching would need an
 * invalidation path parallel to the existing configuration listener.
 */
export function getRegistryUrl(): string | undefined {
	const url = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>('registryUrl');
	return url?.trim() || undefined;
}

/**
 * Resolution order: a registry, then hand-written `customModels`, then the
 * built-ins. The registry wins when it has anything to say, so a fleet is
 * described in one place — but it is never waited on, so an unreachable
 * registry falls through to whatever is configured locally.
 */
export function getModels(): ModelDefinition[] {
	const remote = getRemoteModels(getRegistryUrl());
	if (remote.length > 0) {
		return remote;
	}

	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const { models, problems } = validateCustomModels(config.get<unknown>('customModels'));

	for (const problem of problems) {
		logger.warn(`Ignoring invalid custom model — ${problem}`);
	}

	return models.length > 0 ? models : BUILTIN_MODELS;
}

/** Kick a background refresh; the picker never waits on it. */
export function refreshRegistry(onChanged: () => void): void {
	refreshRemoteModels(getRegistryUrl(), onChanged);
}
