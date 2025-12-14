# API调用失败问题修复说明

## 🐛 问题分析

从错误日志可以看到两个主要问题：

### 问题1：API URL不完整
```
API URL: https://yunwu.ai/v1
错误: Invalid URL (POST /v1)
```

**原因**：
- 用户输入的API地址是基础URL：`https://yunwu.ai/v1`
- 但OpenAI兼容的TTS API需要完整端点：`https://yunwu.ai/v1/audio/speech`
- 直接调用 `/v1` 会返回404错误

### 问题2：requestBody模板未保存
```
config.requestBody 存在? false
⚠️ 警告: config.requestBody 为空，使用默认格式
```

**原因**：
- 在 `CherryStyleProviderManager` 中，选择模板时没有正确设置 `requestBody`
- 保存供应商时，`requestBody` 为 `undefined`
- 导致使用默认格式，可能不符合API要求

---

## ✅ 修复方案

### 修复1：自动补全API端点

在 `lib/providers/generic/caller.ts` 中添加了自动补全逻辑：

**TTS API**：
```typescript
// 如果是OpenAI风格且URL是基础URL，自动添加TTS端点
if (config.templateType === 'openai' && !apiUrl.includes('/audio/')) {
  if (apiUrl.endsWith('/v1') || apiUrl.endsWith('/v1/')) {
    apiUrl = apiUrl.replace(/\/v1\/?$/, '/v1/audio/speech');
  }
}
```

**ASR API**：
```typescript
// 如果是OpenAI风格且URL是基础URL，自动添加ASR端点
if (config.templateType === 'openai' && !apiUrl.includes('/audio/')) {
  if (apiUrl.endsWith('/v1') || apiUrl.endsWith('/v1/')) {
    apiUrl = apiUrl.replace(/\/v1\/?$/, '/v1/audio/transcriptions');
  }
}
```

### 修复2：正确保存requestBody模板

在 `app/settings/CherryStyleProviderManager.tsx` 中修复了 `handleTemplateChange`：

```typescript
const handleTemplateChange = (templateType: TemplateType) => {
  // ... 获取模板
  
  // 根据服务类型选择正确的请求体模板
  let requestBody = '';
  if (formData.serviceType === 'asr') {
    requestBody = template.requestBodyTemplate.asr || '';
  } else if (formData.serviceType === 'tts') {
    requestBody = template.requestBodyTemplate.tts || '';
  } else {
    // both: 优先使用TTS模板
    requestBody = template.requestBodyTemplate.tts || template.requestBodyTemplate.asr || '';
  }

  setFormData({
    ...formData,
    // ...
    requestBody: requestBody, // ✅ 确保保存请求体模板
    // ...
  });
};
```

---

## 📋 修复后的行为

### 之前
- ❌ `https://yunwu.ai/v1` → 404错误
- ❌ `requestBody` 为空 → 使用默认格式

### 现在
- ✅ `https://yunwu.ai/v1` → 自动转换为 `https://yunwu.ai/v1/audio/speech` (TTS)
- ✅ `https://yunwu.ai/v1` → 自动转换为 `https://yunwu.ai/v1/audio/transcriptions` (ASR)
- ✅ `requestBody` 正确保存 → 使用模板格式

---

## 🎯 使用建议

### 方式1：使用基础URL（推荐）
```
API地址: https://yunwu.ai/v1
```
系统会自动补全为：
- TTS: `https://yunwu.ai/v1/audio/speech`
- ASR: `https://yunwu.ai/v1/audio/transcriptions`

### 方式2：使用完整端点
```
TTS API地址: https://yunwu.ai/v1/audio/speech
ASR API地址: https://yunwu.ai/v1/audio/transcriptions
```
如果已经包含 `/audio/`，系统不会再次修改。

---

## 🔍 验证修复

修复后，再次调用应该看到：

```
API URL: https://yunwu.ai/v1/audio/speech  ✅
config.requestBody 存在? true  ✅
使用的请求体模板: {...}  ✅
```

---

## 📝 注意事项

1. **自动补全仅适用于OpenAI兼容的API**
   - 如果使用其他模板类型（Qwen、豆包等），需要手动输入完整URL

2. **如果API端点不同**
   - 如果服务商的端点不是 `/v1/audio/speech`，需要手动输入完整URL
   - 例如：`https://api.example.com/custom/tts`

3. **requestBody模板**
   - 选择模板后，系统会自动填充请求体模板
   - 如果模板中没有对应的模板，会使用默认格式

---

## 🎉 总结

修复后，用户可以：
- ✅ 输入基础URL，系统自动补全端点
- ✅ 请求体模板正确保存和使用
- ✅ 减少配置错误，提高成功率

**现在应该可以正常调用了！** 🚀

