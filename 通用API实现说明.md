# 通用API功能实现说明

## 概述

已成功实现方案C（混合模式），支持：
1. **保留传统云服务商**：腾讯云、百度云、阿里云（开箱即用）
2. **通用API调用器**：支持接入任意兼容的大模型API
3. **预设模板**：OpenAI、Qwen、豆包三种模板
4. **完全自定义**：支持用户完全自定义API格式

## 实现的功能

### 1. 核心组件

#### 1.1 类型定义 (`lib/providers/generic/types.ts`)
- `GenericProviderConfig`: 通用API配置接口
- `LegacyProviderConfig`: 传统服务商配置接口
- `ProviderConfig`: 联合类型
- `APITemplate`: 模板定义接口
- `RequestVariables`: 请求变量映射

#### 1.2 模板系统 (`lib/providers/generic/templates.ts`)
预设了三种模板：
- **OpenAI风格**：适用于OpenAI Whisper、DeepSeek、Moonshot等
- **Qwen风格**：适用于阿里云通义千问
- **豆包风格**：适用于字节跳动豆包语音服务
- **自定义模板**：完全自定义

#### 1.3 调用器 (`lib/providers/generic/caller.ts`)
- `callGenericASR()`: 调用通用ASR API
- `callGenericTTS()`: 调用通用TTS API
- 支持变量替换、路径解析、错误处理

### 2. 配置管理更新

#### 2.1 配置结构 (`lib/utils/config.ts`)
```typescript
interface AppConfig {
  legacyProviders: {  // 传统服务商
    aliyun: LegacyProviderConfigLocal;
    tencent: LegacyProviderConfigLocal;
    baidu: LegacyProviderConfigLocal;
  };
  genericProviders: GenericProviderConfig[];  // 通用API列表
  tts: { ... };
  asr: { ... };
}
```

#### 2.2 新增函数
- `addGenericProvider()`: 添加通用API
- `updateGenericProvider()`: 更新通用API
- `removeGenericProvider()`: 删除通用API
- `getAllEnabledProviders()`: 获取所有启用的提供者（传统+通用）

### 3. 设置页面增强

#### 3.1 新增组件 (`app/settings/GenericProviderManager.tsx`)
- 添加/编辑通用API配置
- 选择模板类型
- 配置API地址、密钥、请求格式等
- 高级选项（请求体模板、响应路径等）

#### 3.2 设置页面更新 (`app/settings/page.tsx`)
- 分为两个部分：
  - **传统云服务商配置**：腾讯云、百度云、阿里云
  - **大模型API配置**：通用API管理组件

### 4. TTS/ASR页面更新

#### 4.1 TTS页面 (`app/tts/page.tsx`)
- 支持选择传统服务商和通用API
- 显示API类型标签（legacy/generic）
- 支持为每个提供者选择音色

#### 4.2 ASR页面 (`app/asr/page.tsx`)
- 支持选择传统服务商和通用API
- 显示API类型标签
- 统一的供应商选择界面

### 5. API路由更新

#### 5.1 TTS API (`app/api/tts/route.ts`)
- 支持调用传统服务商和通用API
- 统一处理结果格式
- 并发调用所有启用的提供者

#### 5.2 ASR API (`app/api/asr/route.ts`)
- 支持调用传统服务商和通用API
- 统一处理结果格式
- 并发调用所有启用的提供者

## 使用流程

### 添加通用API

1. **访问设置页面** (`/settings`)
2. **点击"添加API"**
3. **选择模板类型**：
   - OpenAI风格（最通用）
   - Qwen风格
   - 豆包风格
   - 自定义（完全自定义）
4. **填写配置**：
   - 名称：自定义名称
   - API地址：API端点URL
   - API密钥：认证密钥
   - 服务类型：ASR/TTS/两者
5. **高级选项**（可选）：
   - 请求体模板：自定义请求格式
   - 响应路径：指定响应中数据的路径
6. **保存配置**

### 使用通用API

1. **访问TTS/ASR页面**
2. **选择启用的提供者**（包括通用API）
3. **执行测试**
4. **查看对比结果**

## 模板变量说明

在请求体模板中可以使用以下变量：

### ASR变量
- `{audio}` 或 `{audioBase64}`: 音频文件的base64编码
- `{language}`: 语言代码（如：zh, en）
- `{format}`: 音频格式（如：wav, mp3）
- `{model}`: 模型名称

### TTS变量
- `{text}`: 要合成的文本
- `{model}`: 模型名称
- `{voice}`: 音色
- `{speed}`: 语速
- `{volume}`: 音量
- `{pitch}`: 音调
- `{language}`: 语言代码

## 响应路径说明

使用点号或方括号访问嵌套对象：
- `text`: 直接访问 `response.text`
- `result.text`: 访问 `response.result.text`
- `data[0].text`: 访问 `response.data[0].text`

## 示例配置

### OpenAI Whisper示例
```json
{
  "name": "OpenAI Whisper",
  "templateType": "openai",
  "apiUrl": "https://api.openai.com/v1/audio/transcriptions",
  "method": "POST",
  "authType": "bearer",
  "apiKey": "sk-...",
  "serviceType": "asr"
}
```

### 自定义API示例
```json
{
  "name": "我的自定义API",
  "templateType": "custom",
  "apiUrl": "https://api.example.com/v1/asr",
  "method": "POST",
  "authType": "bearer",
  "apiKey": "your-api-key",
  "requestBody": "{\"audio\": \"{audio}\", \"language\": \"{language}\"}",
  "responseTextPath": "result.text",
  "serviceType": "asr"
}
```

## 技术特点

### 1. 灵活性
- 支持任意兼容的API格式
- 完全自定义请求和响应格式
- 支持多种认证方式

### 2. 易用性
- 预设模板，快速配置
- 清晰的配置界面
- 详细的错误提示

### 3. 兼容性
- 保留传统服务商，向后兼容
- 统一的结果格式
- 混合使用传统和通用API

### 4. 扩展性
- 易于添加新模板
- 支持未来扩展
- 模块化设计

## 注意事项

1. **API密钥安全**：所有密钥仅存储在浏览器本地（localStorage）
2. **CORS问题**：如果API不支持CORS，可能需要通过代理
3. **错误处理**：确保配置正确的错误路径
4. **响应格式**：确保响应格式与配置的路径匹配

## 后续优化建议

1. **配置导入/导出**：支持配置的导入导出
2. **配置模板市场**：用户分享配置模板
3. **API测试功能**：在设置页面测试API连接
4. **使用统计**：记录API调用次数和成功率
5. **批量测试**：支持批量测试多个API

## 总结

成功实现了混合模式的通用API功能，既保留了传统服务商的易用性，又提供了接入任意大模型API的灵活性。用户可以根据需求选择最适合的方案。
