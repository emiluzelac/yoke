Yoke 运行的是**你自己**接口上的模型。将它指向你的服务并声明模型即可——除非使用官方 DeepSeek API，否则无需 API Key。

```json
{
  "yoke.baseUrl": "http://127.0.0.1:8000/v1",
  "yoke.customModels": [
    {
      "id": "your-model-id",
      "name": "你的模型（本地）",
      "maxInputTokens": 96000,
      "maxOutputTokens": 32768
    }
  ]
}
```

自托管服务通常由提示词和补全共享同一预算，因此 `maxInputTokens` 应设为服务上限**减去** `maxOutputTokens`。

不确定服务的参数？在仓库中运行 `npm run verify-endpoint -- <baseUrl>`，它会直接输出这段配置。

- `Cmd/Ctrl + Shift + P`：打开命令面板
- `Yoke: 设置 API Key`：仅在使用官方 DeepSeek API 时需要
- `Yoke: 清除 API Key`：移除已保存的 Key
