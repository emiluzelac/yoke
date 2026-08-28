<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/emiluzelac/yoke/main/resources/yoke-combomark-dark.png">
    <img src="https://raw.githubusercontent.com/emiluzelac/yoke/main/resources/yoke-combomark.png" width="420" alt="Yoke">
  </picture>
</p>

<p align="center"><strong>你的模型，你的机器，你的代码。</strong></p>

<!-- marketplace-readme:remove-start -->
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=yoketools.yoke"><img src="https://img.shields.io/badge/VS%20Code%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white&style=for-the-badge" alt="从 VS Code Marketplace 安装"></a>
  <br/>
</p>
<!-- marketplace-readme:remove-end -->

<p align="center">
  <a href="https://github.com/emiluzelac/yoke/blob/main/README.md">English</a> |
  简体中文
</p>

**在你已经使用的 VS Code 聊天界面中运行自己的模型。**

Yoke 将本地部署的 DeepSeek——以及任何你自行托管的兼容 OpenAI 的模型——接入
VS Code 原生聊天与模型选择器。无需托管版 API Key，没有按 token 计费，也不必学习另一套
聊天界面。如果你需要，它同样支持官方 DeepSeek API。

> 本项目派生自 [Vizards/deepseek-v4-for-copilot](https://github.com/Vizards/deepseek-v4-for-copilot)，
> 后者面向官方 DeepSeek API，而 Yoke 专注于自托管推理。请勿同时安装两者——
> 它们注册各自独立的 provider，模型会在选择器中重复出现。

## 为什么选这个扩展？

- **不是替换 Copilot，而是增强它。** 没有新的侧边栏，没有新的聊天界面需要学习。只是在你已经在用的模型选择器中多了一个选项。
- **Agent 模式、工具调用、Instructions、MCP、Skills——全部正常运作。** Copilot 的完整能力栈，现在跑在 DeepSeek 上。
- **两种图片处理方式。** Flash Vision Exp 会原生接收图片附件；Flash 和 Pro 则保留原有文本上下文，由可配置的视觉代理将图片转换为文字描述。
- **你的模型，你的机器。** 指向自己的 vLLM、SGLang、llama.cpp 或 Ollama 服务。无需托管版 API Key，没有按 token 计费，提示词也不会离开你的网络。
- **支持任意兼容 OpenAI 的模型。** 在一处设置中声明模型 id、上下文长度与能力即可。DeepSeek、Qwen、GLM、Kimi——只要支持 `/v1/chat/completions` 就能用。
- **仍然支持官方 API。** 保持默认设置并填入 DeepSeek Key，即可像以前一样使用云端模型。密钥存储在操作系统密钥链中，不会以明文形式写入磁盘。

## 功能特性

### 你的模型出现在模型选择器中
使用 `yoke.customModels` 声明你的自托管模型，它们便会与其他模型并列出现在聊天模型选择器中，并使用服务实际具备的上下文长度。若不做任何配置，则获得三个内置的 DeepSeek 云端模型——Flash、Pro 和实验性的 Flash Vision Exp——支持长上下文、工具调用和可配置的思考深度。

### 原生视觉与视觉代理
可以根据对话需要选择不同的图片处理路径：

- **DeepSeek V4 Flash Vision Exp** 将图片附件作为原生多模态输入处理，不经过视觉代理。它是一个独立暴露的实验模型；如果当前 API 端点不支持其模型 ID，插件不会静默降级。
- **DeepSeek V4 Flash 和 Pro** 使用视觉代理：先由支持图片输入的模型描述附件，再将描述连同对话内容交给 DeepSeek 主模型。自动模式会在可用时选择 Flash Vision Exp，同时继续支持显式配置其他 VS Code 模型或 API 端点。

如果你在意 DeepSeek 前缀缓存的复用，不建议只为查看一张图片而在对话中途切换模型。需要原生视觉时，可以从对话开始就选择 Flash Vision Exp；希望继续使用 Flash/Pro 时，则让视觉代理处理图片并保留主模型选择。

### 思考模式与推理深度控制
完整支持 DeepSeek V4 的 `reasoning_content`。Flash、Pro 和 Flash Vision Exp 均可选择 `停用`、`轻量`、`标准`（均衡，默认）或 `深度`（适用于复杂 Agent 任务），与官方 API 已实现的推理档位保持一致。

### 继承全部 Copilot 能力
由于本扩展接入的是 Copilot 的原生 provider API，你免费获得完整能力栈：
- **Agent 模式**——自主执行多步骤任务
- **工具调用**——文件编辑、终端操作、工作区搜索、Git、测试
- **Instructions & Skills**——你的 `.instructions.md`、`AGENTS.md` 和各项 Skills 开箱即用
- **Prompt 缓存统计**——在输出通道中记录 DeepSeek 缓存命中率，直观看到成本节省

### 安全优先
API Key 存储在 VS Code 的 `SecretStorage` 中（macOS 钥匙串 / Windows 凭据管理器 / Linux 密钥环）。绝不会出现在 `settings.json` 中，也不会被提交到 Git 历史。

### 零运行时依赖
纯 VS Code API + Node.js 内置模块。无需 Python、Docker 或本地代理进程。

## 快速开始

### 前置条件

- VS Code 1.116 及以上版本。本扩展依赖非公开的 Copilot Chat API，较新的 VS Code 版本可能存在兼容性问题——如遇到请[提交 Issue](https://github.com/emiluzelac/yoke/issues)。
- GitHub Copilot 订阅（Free / Pro / Enterprise——免费版即可使用）
- 一个兼容 OpenAI 的接口——你自己的服务，或用于云端模型的 DeepSeek API Key（从 [platform.deepseek.com](https://platform.deepseek.com) 获取）。仅 `api.deepseek.com` 需要 Key

### 安装方式

从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yoketools.yoke) 安装，或自行构建：

```bash
npm ci && npm run package
code --install-extension dist/yoke-*.vsix
```

### 使用步骤

1. 通过命令面板（`Cmd+Shift+P`）运行 **DeepSeek: 设置 API Key**
2. 粘贴你的 Key 或兼容的 provider token（官方 DeepSeek Key 通常以 `sk-` 开头）
3. 打开 Copilot Chat，点击模型选择器，选择 **DeepSeek V4 Flash**、**DeepSeek V4 Pro** 或 **DeepSeek V4 Flash Vision Exp**
4. 搞定——开始聊天

## 内置模型

以下是 `yoke.customModels` 留空时获得的模型。它们调用官方 DeepSeek API，需要 Key。
如需使用自己的服务，请见下方**自托管部署**。

| 模型 | 图片处理 | 思考深度 | 适用场景 |
|---|---|---|---|
| **DeepSeek V4 Flash** | 视觉代理 | `停用` / `轻量` / `标准` / `深度` | 日常快速编码、小改动、低成本迭代 |
| **DeepSeek V4 Pro** | 视觉代理 | `停用` / `轻量` / `标准` / `深度` | 复杂重构、Agent 任务、深度推理 |
| **DeepSeek V4 Flash Vision Exp** | 原生图片输入 | `停用` / `轻量` / `标准` / `深度` | 直接、实验性的图片理解与快速推理 |

三者均支持可选的思考模式、工具调用和 1M Token 上下文。Flash Vision Exp 仍是实验模型；直接使用时，自定义 API 端点或兼容服务商必须提供为它配置的模型 ID。

## 设置项

| 设置项 | 默认值 | 作用 |
|---|---|---|
| `yoke.baseUrl` | 官方 DeepSeek API | 你的兼容 OpenAI 接口地址 |
| `yoke.registryUrl` | *(无)* | 列出你所运行接口的注册表；会替代 `customModels` |
| `yoke.customModels` | `[]` | 要暴露的模型，详见下文 |
| `yoke.maxTokens` | `0` | 输出 token 上限（`0` 表示服务默认） |
| `yoke.requestTimeoutMs` | `900000` | 超过该时长没有收到数据即放弃（`0` 表示一直等待） |
| `yoke.visionModel` | *(自动)* | 处理图片附件的视觉代理 |
| `yoke.visionPrompt` | *(内置)* | 视觉代理描述图片所用的提示词 |
| `yoke.debugMode` | `minimal` | `minimal`、`metadata` 或 `verbose` |
| `yoke.modelIdOverrides` | *(仅内置模型)* | 重命名三个内置云端模型的 ID |
| `yoke.experimental.stabilizeToolList` | `false` | 预激活工具以稳定 `tools` 列表 |

思考深度可通过 Copilot Chat 的模型选择器为每个模型单独设置。

**`debugMode`** 只影响诊断信息，token 用量始终会上报。`metadata` 记录请求哈希、
前缀重叠和工具 schema 变化，不含提示词原文，可安全贴入 Issue。`verbose` 会将完整
请求体写入磁盘，**包含**你的提示词内容，可用 `Yoke: 打开请求转储目录` 查看。

**`stabilizeToolList`** 为实验性设置。它预先激活虚拟工具，使 `tools` 参数在多轮之间
保持稳定，从而可能提高提示词缓存命中率——代价是 input tokens 增加。已启用工具在
64 个及以下时请保持关闭，超过 128 个时不要开启。

## 自托管部署

将 `yoke.baseUrl` 指向你的服务并声明模型即可。**除非使用官方 DeepSeek API，否则
无需 API Key**——Yoke 仅对 `api.deepseek.com` 强制要求 Key；只要你配置了 Key，
在任何主机上都会照常发送。

```json
{
  "yoke.baseUrl": "http://127.0.0.1:8888/v1",
  "yoke.customModels": [
    {
      "id": "deepseek-v4-flash-0731",
      "name": "DeepSeek V4 Flash（本地）",
      "detail": "vLLM 张量并行，1M 上下文",
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

`id` 会原样发送给你的接口，因此必须与服务在 `GET /v1/models` 中公布的名称一致。
格式错误的条目会被记录并跳过，内置模型仍然可用，不会让模型选择器变空。

### 检查你的接口

在配置之前——或在提交 Issue 之前——先探测你的服务：

```bash
npm run verify-endpoint -- http://127.0.0.1:8888/v1
```

它会报告接口公布了哪些模型、是否需要 API Key、推理内容以 `delta.reasoning` 还是
`delta.reasoning_content` 返回、以及是否启用了工具调用，然后打印一段可直接粘贴的设置，
其中的上下文长度取自服务本身并已完成换算。使用 `--model <id>` 指定模型，
`--key <apiKey>` 用于需要鉴权的接口。该脚本仅依赖 Node 内置模块，无需构建扩展即可运行。

### 用一处注册表替代多份副本

当你有多台机器或多个接口时，同一份模型配置会被复制到每个客户端，而且每次调整
lane 都要重新手工换算。将 `yoke.registryUrl` 指向一个列出你所运行接口的服务，
这些副本就消失了：

```json
{ "yoke.registryUrl": "http://127.0.0.1:8899/registry" }
```

其中的模型会替代 `customModels`，从而在一处描述整个集群。扩展不会等待注册表：
模型选择器使用上次返回的结果渲染；若注册表不可达，`customModels` 仍作为兜底。

### 上下文长度的换算

托管版 API 对提示词和补全分别计算预算，而自托管服务通常不是：vLLM 的
`max_model_len` 是**两者共享的同一个预算**。请将 `maxInputTokens` 设为服务上限减去
`maxOutputTokens`——上面的例子即 1048576 − 65536。若按完整上限填写输入长度，较长的
请求会被服务拒绝。

### 较长的对话

自托管服务在返回第一个字节之前，可能需要数分钟来预填充较长的对话。Node 的 `fetch`
在静默 5 分钟后就会放弃请求，且无法调整，因此 Yoke 直接使用 `node:http`，默认等待
15 分钟。如果在较慢或负载较高的机器上，Agent 会话仍被中断，请调大
`yoke.requestTimeoutMs`，或设为 `0` 表示一直等待。

### 非 DeepSeek 模型

`thinkingParam` 默认为 `"none"`，即只发送标准的 `reasoning_effort`，并省略 DeepSeek
专有的 `thinking` 字段——这对 Qwen、GLM、Kimi 以及其他兼容 OpenAI 的模型才是正确的，
对会拒绝未知字段的严格网关也更安全。仅当自托管的 DeepSeek 构建确实支持该字段时，
才将其设为 `"deepseek"`。

### 推理内容输出

vLLM 与 SGLang 以 `delta.reasoning` 流式返回推理内容，而 DeepSeek API 使用
`delta.reasoning_content`。Yoke 两者都接受，因此思考过程都能正常显示。注意
`reasoning_effort` 会让对话模板注入一段指令，每次请求会多消耗少量提示词 token。

### 视觉能力

纯文本的本地模型同样可以通过视觉代理处理图片附件。在另一个接口上部署视觉模型，并用
`Yoke: 配置视觉代理` 指向它——一个兼容 OpenAI 的 chat-completions URL，
带上自己的模型 id，无需 Key。

## 方案对比

| | 本扩展 | 本地代理（如 LiteLLM） | 独立 DeepSeek 扩展 |
|---|---|---|---|
| 在 Copilot Chat 内使用 | ✅ | ✅ | ❌ 独立界面 |
| Agent 模式、工具、Skills | ✅ | ✅ | ⚠️ 自行实现 |
| 视觉支持 | ✅ 原生 + 代理 | ❌ | ❌ |
| 无需额外运行进程 | ✅ | ❌ | ✅ |
| 一键安装 | ✅ | ❌ | ✅ |
| API Key 存系统密钥链 | ✅ | ❌ | ⚠️ 各异 |

## 许可证

[MIT](LICENSE)
