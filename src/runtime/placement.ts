/**
 * Where Yoke runs relative to Copilot Chat.
 *
 * VS Code hands a chat turn's model to the extension host that serves the chat
 * participant — Copilot Chat — and that host can only resolve models registered
 * *in it* (`ExtHostLanguageModels` keeps a per-host `_localModels` cache and
 * refuses anything else). In a remote window Copilot Chat runs on the remote
 * host. A Yoke left in the local UI host registers its models where Copilot
 * cannot see them, and Copilot falls back to its own default model for every
 * turn without saying so — carrying Yoke's reasoning effort along, which the
 * fallback model may reject with a 400.
 *
 * Kept free of the `vscode` import so it can be unit-tested.
 */

/** `vscode.ExtensionKind.UI`; the enum needs the runtime, the number does not. */
export const UI_EXTENSION_KIND = 1;

export const REMOTE_DOCS_URL =
	'https://github.com/emiluzelac/yoke#remote-ssh-dev-containers-and-wsl';

export interface HostPlacement {
	/** `vscode.env.remoteName` — undefined in a local window. */
	readonly remoteName: string | undefined;
	/** `context.extension.extensionKind`. */
	readonly extensionKind: number;
}

/** True when Yoke sits in the local UI host of a remote window, out of Copilot Chat's reach. */
export function isStrandedInUiHost({ remoteName, extensionKind }: HostPlacement): boolean {
	return remoteName !== undefined && extensionKind === UI_EXTENSION_KIND;
}
