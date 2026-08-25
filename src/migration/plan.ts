/**
 * Decide what a `deepseek-copilot.*` → `yoke.*` settings migration should
 * write. Pure so it is unit-testable; `runMigration` performs the writes.
 *
 * `apiKey` is absent here on purpose: it lives in SecretStorage, not settings,
 * and is migrated separately.
 */

export const MIGRATED_SETTINGS = [
	'baseUrl',
	'maxTokens',
	'modelIdOverrides',
	'customModels',
	'visionModel',
	'visionPrompt',
	'debugMode',
	'experimental.stabilizeToolList',
] as const;

export interface ScopedValues {
	globalValue?: unknown;
	workspaceValue?: unknown;
}

export interface SettingMigrationPlan {
	global?: unknown;
	workspace?: unknown;
}

/**
 * Copy a legacy value into the new namespace only where the new namespace is
 * still unset, so re-running is a no-op and a deliberate new value always wins.
 */
export function planSettingMigration(
	legacy: ScopedValues,
	next: ScopedValues,
): SettingMigrationPlan {
	const plan: SettingMigrationPlan = {};
	if (next.globalValue === undefined && legacy.globalValue !== undefined) {
		plan.global = legacy.globalValue;
	}
	if (next.workspaceValue === undefined && legacy.workspaceValue !== undefined) {
		plan.workspace = legacy.workspaceValue;
	}
	return plan;
}
