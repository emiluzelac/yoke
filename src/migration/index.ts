import vscode from 'vscode';
import { API_KEY_SECRET, CONFIG_SECTION, WELCOME_SHOWN_KEY } from '../consts';
import { logger } from '../logger';
import { MIGRATED_SETTINGS, planSettingMigration } from './plan';

const LEGACY_SECTION = 'deepseek-copilot';
const LEGACY_API_KEY_SECRET = 'deepseek-copilot.apiKey';
const LEGACY_WELCOME_SHOWN_KEY = 'deepseek-copilot.welcomeShown';

/**
 * One-time move from the upstream `deepseek-copilot` identity to `yoke`.
 *
 * Only ever writes where the new namespace is unset, so it is idempotent and a
 * deliberate new value always wins. Failures are logged, never thrown — a
 * migration problem must not block activation.
 */
export async function runMigration(context: vscode.ExtensionContext): Promise<void> {
	try {
		await migrateSettings();
		await migrateApiKey(context);
		await migrateWelcomeFlag(context);
	} catch (error) {
		logger.warn('Settings migration from deepseek-copilot did not complete', error);
	}
}

async function migrateSettings(): Promise<void> {
	const legacy = vscode.workspace.getConfiguration(LEGACY_SECTION);
	const next = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const hasWorkspace = Boolean(
		vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length,
	);

	for (const key of MIGRATED_SETTINGS) {
		const plan = planSettingMigration(legacy.inspect(key) ?? {}, next.inspect(key) ?? {});
		if (plan.global !== undefined) {
			await next.update(key, plan.global, vscode.ConfigurationTarget.Global);
			logger.info(`Migrated ${LEGACY_SECTION}.${key} to ${CONFIG_SECTION}.${key} (user)`);
		}
		if (plan.workspace !== undefined && hasWorkspace) {
			await next.update(key, plan.workspace, vscode.ConfigurationTarget.Workspace);
			logger.info(`Migrated ${LEGACY_SECTION}.${key} to ${CONFIG_SECTION}.${key} (workspace)`);
		}
	}
}

async function migrateApiKey(context: vscode.ExtensionContext): Promise<void> {
	if (await context.secrets.get(API_KEY_SECRET)) {
		return;
	}
	const legacyKey = await context.secrets.get(LEGACY_API_KEY_SECRET);
	if (!legacyKey) {
		return;
	}
	await context.secrets.store(API_KEY_SECRET, legacyKey);
	await context.secrets.delete(LEGACY_API_KEY_SECRET);
	logger.info('Migrated the stored API key to the Yoke secret');
}

async function migrateWelcomeFlag(context: vscode.ExtensionContext): Promise<void> {
	if (context.globalState.get(WELCOME_SHOWN_KEY) !== undefined) {
		return;
	}
	if (context.globalState.get(LEGACY_WELCOME_SHOWN_KEY) !== undefined) {
		await context.globalState.update(WELCOME_SHOWN_KEY, true);
	}
}
