Yoke runs models from **your** endpoint. Point it at your server and declare what it serves — no API key required unless you use the hosted DeepSeek API.

```json
{
  "yoke.baseUrl": "http://127.0.0.1:8000/v1",
  "yoke.customModels": [
    {
      "id": "your-model-id",
      "name": "Your model (local)",
      "maxInputTokens": 96000,
      "maxOutputTokens": 32768
    }
  ]
}
```

Your server usually shares one budget between prompt and completion, so set `maxInputTokens` to its limit **minus** `maxOutputTokens`.

Not sure what your server reports? Run `npm run verify-endpoint -- <baseUrl>` from the repo — it prints this block for you.

- `Cmd/Ctrl + Shift + P`: Open the Command Palette
- `Yoke: Set API Key`: Only needed for the hosted DeepSeek API
- `Yoke: Clear API Key`: Remove a stored key
