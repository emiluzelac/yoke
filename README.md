<h1 align="center">Yoke</h1>

<p align="center"><strong>Your model. Your machine. Your code.</strong></p>

<!-- marketplace-readme:remove-start -->
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=yoketools.yoke"><img src="https://img.shields.io/badge/VS%20Code%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white&style=for-the-badge" alt="Install from VS Code Marketplace"></a>
  <br/>
</p>
<!-- marketplace-readme:remove-end -->

<p align="center">
  English |
  <a href="https://github.com/emiluzelac/yoke/blob/main/README.zh-cn.md">简体中文</a>
</p>

**Run your own models in the VS Code chat you already use.**

Yoke puts locally hosted DeepSeek — and any other OpenAI-compatible model
you serve yourself — into VS Code's native chat and model picker. No hosted API
key, no per-token charges, and no separate chat UI to learn. It also still works
against the hosted DeepSeek API if you want both.

> Forked from [Vizards/deepseek-v4-for-copilot](https://github.com/Vizards/deepseek-v4-for-copilot),
> which targets the hosted DeepSeek API. Yoke's focus is self-hosted
> inference. Don't install both — they register separate providers, so every model
> would appear twice in the picker.

## Why this extension?

- **Don't replace Copilot — power it up.** No new sidebar, no new chat UI to learn. Just a new model in the picker you already use.
- **Agent mode, tool calling, instructions, MCP, skills — all of it still works.** Copilot's entire stack, now running on DeepSeek.
- **Two ways to work with images.** Flash Vision Exp receives image attachments natively. Flash and Pro keep their existing text context while a configurable Vision Proxy turns images into descriptions.
- **Your model, your machine.** Point it at your own vLLM, SGLang, llama.cpp, or Ollama server. No hosted API key, no per-token bill, no prompts leaving your network.
- **Bring any OpenAI-compatible model.** Declare its id, context window, and capabilities in one settings block. DeepSeek, Qwen, GLM, Kimi — if it speaks `/v1/chat/completions`, it works.
- **Still supports the hosted API.** Leave the defaults alone and set a DeepSeek key for the cloud models, exactly as before.

## Features

### Your models in the model picker
Declare your self-hosted models with `yoke.customModels` and they appear alongside everything else in the chat model selector, with the context window your server actually has. Configure nothing and you get the three built-in DeepSeek cloud models — Flash, Pro, and the experimental Flash Vision Exp — with long context, tool calling, and configurable thinking effort.

### Native Vision and Vision Proxy
Choose the image path that fits the conversation:

- **DeepSeek V4 Flash Vision Exp** handles image attachments as native multimodal input, without Vision Proxy. It is exposed as a separate experimental model and does not silently fall back when the configured API endpoint does not support its model ID.
- **DeepSeek V4 Flash and Pro** use Vision Proxy: an image-capable model first describes each attachment, then the main DeepSeek model receives the description with the conversation. Auto mode selects Flash Vision Exp when available, while an explicitly configured VS Code model or API endpoint remains supported.

Avoid switching models mid-chat just to inspect an image if DeepSeek prefix-cache reuse matters. Start the conversation with Flash Vision Exp for native vision, or stay on Flash/Pro and let Vision Proxy preserve the main model choice.

### Thinking Mode with Reasoning Effort Control
Full support for DeepSeek V4's `reasoning_content`. Flash, Pro, and Flash Vision Exp offer `none` (off), `low` (light reasoning), `high` (balanced, default), and `max` (deep reasoning for hard agent tasks), matching the effort levels implemented by the official API.

### Inherits Every Copilot Capability
Because this plugs into Copilot's native provider API, you get the full stack for free:
- **Agent mode** — autonomous multi-step tasks
- **Tool calling** — file edits, terminal, workspace search, Git, tests
- **Instructions & skills** — all your `.instructions.md`, `AGENTS.md`, and skills just work
- **Prompt caching stats** — cache hit rate logged in the output channel, when your endpoint reports it

### Secure by Default
API key lives in VS Code's `SecretStorage` (OS keychain on macOS / Windows / Linux). Never in `settings.json`, never in your Git history.

### Zero Runtime Dependencies
Pure VS Code API + Node.js built-ins. No Python, no Docker, no local proxy server to babysit.

## Getting Started

### Prerequisites

- VS Code 1.116 or later. This extension relies on non-public chat APIs that may break on newer VS Code versions — [report an issue](https://github.com/emiluzelac/yoke/issues) if you hit one.
- GitHub Copilot subscription (Free / Pro / Enterprise — the free tier works)
- An OpenAI-compatible endpoint — your own server, or a DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com) for the hosted models. A key is only required for `api.deepseek.com`

### Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yoketools.yoke), or build it yourself:

```bash
npm ci && npm run package
code --install-extension dist/yoke-*.vsix
```

### Usage

1. Run **DeepSeek: Set API Key** from the Command Palette (`Cmd+Shift+P`)
2. Paste your key or compatible provider token (official DeepSeek keys usually start with `sk-`)
3. Open Copilot Chat, click the model picker, and choose **DeepSeek V4 Flash**, **DeepSeek V4 Pro**, or **DeepSeek V4 Flash Vision Exp**
4. That's it — chat away

## Built-in models

These are what you get with `yoke.customModels` left empty. They call the hosted
DeepSeek API and need a key. For your own server, see **Self-hosted deployments** below.

| Model | Image Handling | Thinking Effort | Best For |
|---|---|---|---|
| **DeepSeek V4 Flash** | Vision Proxy | `none` / `low` / `high` / `max` | Fast everyday coding, quick edits, cheap iteration |
| **DeepSeek V4 Pro** | Vision Proxy | `none` / `low` / `high` / `max` | Complex refactors, agent tasks, deep reasoning |
| **DeepSeek V4 Flash Vision Exp** | Native image input | `none` / `low` / `high` / `max` | Direct, experimental image understanding with fast reasoning |

All three support optional thinking mode, tool calling, and 1M token context. Flash Vision Exp is experimental.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `yoke.baseUrl` | hosted DeepSeek API | Your OpenAI-compatible endpoint |
| `yoke.registryUrl` | *(none)* | A registry that lists your endpoints; replaces `customModels` |
| `yoke.customModels` | `[]` | The models to expose. See below |
| `yoke.maxTokens` | `0` | Output token cap (`0` = server default) |
| `yoke.requestTimeoutMs` | `900000` | Give up after this long with no data (`0` = never) |
| `yoke.visionModel` | *(auto)* | Vision Proxy for image attachments |
| `yoke.visionPrompt` | *(built-in)* | Prompt the Vision Proxy uses to describe images |
| `yoke.debugMode` | `minimal` | `minimal`, `metadata`, or `verbose` |
| `yoke.modelIdOverrides` | *(built-ins only)* | Renames the three built-in cloud model IDs |
| `yoke.experimental.stabilizeToolList` | `false` | Pre-activates tools to stabilise the `tools` list |

Thinking Effort is configured from Copilot Chat's model picker, per model.

**`debugMode`** controls diagnostics only — token usage is always reported. `metadata`
logs request hashes, prefix overlap, and tool-schema changes with no prompt text, so it
is safe to paste into an issue. `verbose` writes complete request payloads to disk and
**does** contain your prompts; open them with `Yoke: Open Request Dumps Folder`.

**`stabilizeToolList`** is experimental. It pre-activates virtual tools so the `tools`
parameter stays stable between turns, which can raise your prompt-cache hit rate — at the
cost of more input tokens. Leave it off with 64 or fewer enabled tools, and don't enable
it above 128.

## Self-hosted deployments

Point `yoke.baseUrl` at your server and declare your models. **No API key is
needed** unless you are using the official DeepSeek API — Yoke only demands
one for `api.deepseek.com`, and sends a key on any host when you have configured one.

```json
{
  "yoke.baseUrl": "http://127.0.0.1:8888/v1",
  "yoke.customModels": [
    {
      "id": "deepseek-v4-flash-0731",
      "name": "DeepSeek V4 Flash (local)",
      "detail": "vLLM tensor-parallel, 1M context",
      "maxInputTokens": 983040,
      "maxOutputTokens": 65536,
      "thinking": {
        "supportedEfforts": ["low", "high", "max"],
        "defaultEffort": "high",
        "canDisable": true
      }
    }
  ]
}
```

The `id` is sent verbatim to your endpoint, so it must match what the server
advertises at `GET /v1/models`. A malformed entry is logged and skipped — the
built-in models stay available rather than leaving you with an empty picker.

### Checking your endpoint

Before configuring anything — or before filing a bug — probe your server:

```bash
npm run verify-endpoint -- http://127.0.0.1:8888/v1
```

It reports which models the endpoint advertises, whether it needs an API key, whether
reasoning arrives as `delta.reasoning` or `delta.reasoning_content`, and whether tool
calling is enabled — then prints a ready-to-paste settings block with the context window
read off the server and the arithmetic already done. Add `--model <id>` to pick a specific
model and `--key <apiKey>` for an authenticated endpoint. The script is standalone Node,
so it runs without building the extension.

### One registry instead of many copies

Running more than one machine, or more than one endpoint, means the same model
config gets copied into every client — and re-derived by hand every time a lane
changes. Point `yoke.registryUrl` at a service that lists what you run and the
copies go away:

```json
{ "yoke.registryUrl": "http://127.0.0.1:8899/registry" }
```

Its models replace `customModels`, so a fleet is described in one place. The
registry is never waited on: the picker renders from the last set it returned, and
if the registry is unreachable your `customModels` remain the fallback beneath it.
[yoke-registry](https://github.com/emiluzelac/yoke) is a zero-dependency
implementation that also reports whether each endpoint is ready, warming, or cold.

### Sizing the context window

A hosted API bills prompt and completion against separate budgets. A self-hosted
server usually does not: vLLM's `max_model_len` is **one budget shared by both**.
Set `maxInputTokens` to your server's limit minus `maxOutputTokens` — the example
above is 1048576 − 65536. Declaring the full limit as input will get long requests
rejected by the server.

### Long conversations

A self-hosted server can spend many minutes prefilling a long conversation before
it returns its first byte. Node's `fetch` abandons a request after five minutes of
silence and cannot be told otherwise, so Yoke uses `node:http` directly and waits
15 minutes by default. Raise `yoke.requestTimeoutMs` if agent sessions on a slow
or heavily loaded box still get cut short, or set it to `0` to wait indefinitely.

### Non-DeepSeek models

`thinkingParam` defaults to `"none"`, which sends the standard `reasoning_effort`
and omits DeepSeek's proprietary `thinking` field — correct for Qwen, GLM, Kimi,
and anything else OpenAI-compatible, and safe with strict gateways that reject
unknown body fields. Set it to `"deepseek"` only for a self-hosted DeepSeek build
that honours that field.

### Reasoning output

vLLM and SGLang stream reasoning as `delta.reasoning`, where the DeepSeek API uses
`delta.reasoning_content`. Yoke accepts both, so thinking renders either
way. Note that `reasoning_effort` makes the chat template inject an instruction
block, which costs a small number of extra prompt tokens per request.

### Vision

A text-only local model can still handle image attachments through the Vision
Proxy. Serve a vision model on a separate endpoint and point
`Yoke: Configure Vision Proxy` at it — an OpenAI-compatible
chat-completions URL with its own model id, no key required.

### Remote-SSH, Dev Containers, and WSL

In a remote window Copilot Chat runs on the **remote** host, and VS Code only
lets it use language models registered in that same extension host. So Yoke
runs on the remote too — it prefers the workspace host — which means:

- **Install it on the remote.** Extensions view → *Install in SSH: host* (or
  WSL / Dev Container). A Yoke that is only installed locally stays in the UI
  host, where Copilot Chat cannot see it. The failure is otherwise silent —
  Copilot quietly answers from its own default model, and if that model rejects
  the reasoning effort you picked for Yoke, the turn fails with a 400 — so Yoke
  logs a warning and shows one at activation when it finds itself there.
- **`yoke.baseUrl` and `yoke.registryUrl` are per machine.** They are resolved
  where Yoke runs. If the endpoint is reached differently from the remote host —
  say `127.0.0.1:8888` is an SSH tunnel on your workstation — set them in the
  window's **Remote** settings and forward the endpoint to the remote host
  (`ssh -L`, or serve it there). Local windows keep using the User values.

Pinning Yoke to the UI host with `remote.extensionKind` made `127.0.0.1`
resolve on the workstation, but it put the models where Copilot Chat could not
use them. Don't.

## Compared to alternatives

| | This extension | Local proxy (e.g. LiteLLM) | Standalone DeepSeek extensions |
|---|---|---|---|
| Works inside Copilot Chat | ✅ | ✅ | ❌ separate UI |
| Agent mode, tools, skills | ✅ | ✅ | ⚠️ reimplemented |
| Vision support | ✅ native + proxied | ❌ | ❌ |
| No extra process to run | ✅ | ❌ | ✅ |
| One-click install | ✅ | ❌ | ✅ |
| API key in OS keychain | ✅ | ❌ | ⚠️ varies |

## License

[MIT](LICENSE)
