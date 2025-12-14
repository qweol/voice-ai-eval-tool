# Qwen风格使用指南

## 📋 当前配置

### 基本信息
- **模板ID**: `qwen`
- **模板名称**: Qwen风格
- **适用服务**: 阿里云通义千问ASR/TTS服务
- **API地址**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- **认证方式**: Bearer Token（需要DashScope API Key）

### 支持的模型

#### ASR模型
- **qwen-audio-turbo**: 通义千问语音识别模型，支持多语言

#### TTS模型
- **qwen3-tts-flash**: Qwen3-TTS快速模型，低延迟，支持流式输出，提供49种音色

### 请求格式

#### ASR请求体
```json
{
  "model": "qwen-audio-turbo",
  "input": {
    "audio_url": "{audio_url}",  // base64编码的音频数据
    "format": "{format}"          // 音频格式：wav, mp3等
  },
  "parameters": {
    "language": "{language}"      // 语言代码：zh, en等
  }
}
```

#### TTS请求体
```json
{
  "model": "qwen3-tts-flash",
  "input": {
    "text": "{text}",
    "voice": "{voice}",
    "language_type": "{language_type}"  // Chinese, English等
  }
}
```

### 响应格式

#### ASR响应
```json
{
  "output": {
    "text": "识别出的文本"
  }
}
```
- **响应路径**: `output.text`

#### TTS响应
```json
{
  "output": {
    "audio": {
      "data": "base64编码的音频数据"
    }
  }
}
```
- **响应路径**: `output.audio.data`
- **音频格式**: base64

---

## 🚀 如何使用

### 步骤1：获取DashScope API Key

1. 访问 [阿里云DashScope控制台](https://dashscope.console.aliyun.com/)
2. 创建API Key
3. 复制API Key（格式类似：`sk-xxxxxxxxxxxxx`）

### 步骤2：添加供应商

1. 进入**设置页面** → **模型服务**
2. 点击 **"+ 添加供应商"**
3. 填写信息：
   - **供应商名称**: 例如 "阿里云Qwen"
   - **模板类型**: 选择 **"Qwen风格"**
   - **API地址**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
     - 系统会自动填充，无需修改
   - **API密钥**: 粘贴你的DashScope API Key
   - **服务类型**: 选择 "ASR和TTS" 或单独选择
   - **ASR模型**: 选择 "qwen-audio-turbo"
   - **TTS模型**: 选择 "qwen3-tts-flash"
4. 点击 **"添加供应商"** 保存

### 步骤3：使用服务

#### TTS（语音合成）
1. 进入 **TTS页面**
2. 输入要合成的文本
3. 选择音色（Qwen3-TTS支持49种音色）
4. 点击 **"开始合成"**

#### ASR（语音识别）
1. 进入 **ASR页面**
2. 上传音频文件
3. 选择语言（中文/英文等）
4. 点击 **"开始识别"**

---

## ⚠️ 注意事项

### 1. API Key格式
- DashScope API Key格式：`sk-` 开头
- 确保API Key有足够的余额和权限

### 2. 音频格式要求

**ASR**:
- 支持格式：WAV, MP3, M4A等
- 最大文件大小：25MB
- 音频需要先转换为base64编码

**TTS**:
- 输出格式：base64编码的MP3
- 系统会自动解码并保存为音频文件

### 3. 语言类型映射

Qwen TTS需要 `language_type` 参数，系统会自动映射：
- `zh` → `Chinese`
- `en` → `English`
- `ja` → `Japanese`
- 等等...

### 4. 音色选择

Qwen3-TTS-Flash支持49种音色，包括：
- **Cherry** (芊悦) - 阳光积极、亲切自然的小姐姐
- **Ethan** (晨煦) - 标准普通话，阳光、温暖
- **Jennifer** (詹妮弗) - 品牌级、电影质感般的美语女声
- 等等...

在TTS页面选择供应商后，可以从下拉框中选择音色。

---

## 🔧 故障排查

### 问题1：API调用失败 - 401 Unauthorized

**原因**: API Key无效或过期

**解决**:
1. 检查API Key是否正确
2. 确认API Key是否有余额
3. 在DashScope控制台检查API Key状态

### 问题2：API调用失败 - 400 Bad Request

**原因**: 请求格式不正确

**解决**:
1. 检查模型名称是否正确（`qwen-audio-turbo` 或 `qwen3-tts-flash`）
2. 确认请求体模板是否正确
3. 查看控制台日志，检查实际发送的请求体

### 问题3：无法提取音频数据

**原因**: 响应路径配置错误

**解决**:
1. 确认响应路径为 `output.audio.data`
2. 确认响应格式为 `base64`
3. 检查API返回的实际响应结构

### 问题4：识别结果为空

**原因**: 音频格式不支持或音频质量差

**解决**:
1. 确认音频格式在支持列表中
2. 检查音频文件大小（不超过25MB）
3. 尝试使用WAV格式（推荐）

---

## 📝 配置示例

### 完整配置示例

```json
{
  "id": "qwen-provider-1234567890",
  "name": "阿里云Qwen",
  "type": "generic",
  "serviceType": "both",
  "templateType": "qwen",
  "apiUrl": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
  "method": "POST",
  "authType": "bearer",
  "apiKey": "sk-your-dashscope-api-key",
  "selectedModels": {
    "asr": "qwen-audio-turbo",
    "tts": "qwen3-tts-flash"
  },
  "enabled": true
}
```

---

## 🎯 最佳实践

1. **API Key安全**:
   - 不要分享API Key
   - 定期更换API Key
   - 使用环境变量存储（生产环境）

2. **模型选择**:
   - ASR: 使用 `qwen-audio-turbo`（通用识别）
   - TTS: 使用 `qwen3-tts-flash`（低延迟，适合实时场景）

3. **音色选择**:
   - 根据场景选择合适的音色
   - 中文场景推荐：Cherry, Ethan
   - 英文场景推荐：Jennifer

4. **错误处理**:
   - 检查API余额
   - 监控API调用频率
   - 处理网络超时

---

## 📚 参考资源

- [DashScope官方文档](https://help.aliyun.com/zh/model-studio/)
- [Qwen3-TTS文档](https://help.aliyun.com/zh/model-studio/qwen-tts)
- [API调用示例](https://help.aliyun.com/zh/model-studio/developer-reference/api-details-9)

---

## ✅ 检查清单

使用Qwen风格前，请确认：

- [ ] 已获取DashScope API Key
- [ ] API Key有足够余额
- [ ] 已选择正确的模板类型（Qwen风格）
- [ ] API地址正确
- [ ] 已选择模型（ASR和/或TTS）
- [ ] 供应商已启用

完成以上步骤后，就可以使用Qwen服务了！🎉
