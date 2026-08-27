import vscode from 'vscode';
import { getDebugMode, migrateLegacyDebugSetting } from '../config';
import { CONFIG_SECTION } from '../consts';
import { t } from '../i18n';
import { logger } from '../logger';
import { isStrandedInUiHost, REMOTE_DOCS_URL } from './placement';

export async function initializeDiagnostics(context: vscode.ExtensionContext): Promise<void> {
	try {
		await migrateLegacyDebugSetting();
	} catch (error) {
		logger.warn('Failed to migrate legacy debug setting', error);
	}

	logger.info(
		`Activating extension version=${context.extension.packageJSON.version}` +
			` vscode=${vscode.version}` +
			` extensionKind=${context.extension.extensionKind}` +
			` remoteName=${vscode.env.remoteName ?? 'none'}` +
			` uiKind=${vscode.env.uiKind}` +
			` platform=${process.platform}` +
			` arch=${process.arch}` +
			` debugMode=${getDebugMode()}`,
	);

	warnIfStrandedInUiHost(context);

	let currentDebugMode = getDebugMode();
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration(`${CONFIG_SECTION}.debugMode`)) {
				const previous = currentDebugMode;
				currentDebugMode = getDebugMode();
				logger.info(`debugMode changed: ${previous} -> ${currentDebugMode}`);
			}
		}),
	);
}

/**
 * The failure this guards against is silent: Copilot Chat answers from its own
 * default model and nothing in the chat says Yoke was skipped. Say it once, at
 * activation, where the placement is decided.
 */
function warnIfStrandedInUiHost(context: vscode.ExtensionContext): void {
	const remoteName = vscode.env.remoteName;
	if (!isStrandedInUiHost({ remoteName, extensionKind: context.extension.extensionKind })) {
		return;
	}

	logger.warn(
		`Running in the local UI host of a ${remoteName} window; Copilot Chat runs on the remote host` +
			' and cannot use models registered here — install Yoke on the remote host',
	);
	const learnMore = t('placement.learnMore');
	void vscode.window
		.showWarningMessage(t('placement.strandedInUiHost', remoteName ?? ''), learnMore)
		.then((choice) => {
			if (choice === learnMore) {
				void vscode.env.openExternal(vscode.Uri.parse(REMOTE_DOCS_URL));
			}
		});
}
