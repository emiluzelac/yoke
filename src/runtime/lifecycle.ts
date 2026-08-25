import vscode from 'vscode';
import { isCancellationError } from '../cancellation';
import { t } from '../i18n';
import { logger } from '../logger';
import { runMigration } from '../migration';
import { DeepSeekChatProvider } from '../provider';
import { registerActionUrls } from './actions';
import { registerCommands } from './commands';
import { initializeDiagnostics } from './diagnostics';
import { registerProvider } from './provider';
import { showWelcomeIfNeeded } from './welcome';

let activeProvider: DeepSeekChatProvider | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// Before diagnostics: it reads debugMode, which the migration may still be
	// carrying over from the deepseek-copilot namespace.
	await runMigration(context);
	await initializeDiagnostics(context);
	registerCommands(context);
	registerActionUrls(context);

	try {
		const provider = await registerProvider(context);
		activeProvider = provider;

		void showWelcomeIfNeeded(context, provider).catch((error) => {
			logger.warn(t('extension.welcomeFailed'), error);
		});

		logger.info(`Extension activated version=${context.extension.packageJSON.version}`);
	} catch (error) {
		activeProvider = undefined;
		logger.error('Failed to activate DeepSeek extension', error);
		void vscode.window.showErrorMessage(t('extension.activateFailed'));
		throw error;
	}
}

export async function deactivate(): Promise<void> {
	try {
		await activeProvider?.prepareForDeactivate();
	} catch (error) {
		// Same reasoning as the provider: the host cancels during teardown, and
		// that is not something to report as a failure.
		if (isCancellationError(error)) {
			logger.debug('Deactivate cancelled by the host');
		} else {
			logger.warn(t('extension.deactivateFailed'), error);
		}
	} finally {
		activeProvider = undefined;
		logger.info('Extension deactivated');
		logger.dispose();
	}
}
