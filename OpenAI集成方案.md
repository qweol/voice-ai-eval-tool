# OpenAI 语音服务集成方案

## 一、项目现状分析

### 1.1 当前架构
项目已经实现了通用API调用框架，包括：
- ✅ 通用API调用器 (`lib/providers/generic/caller.ts`)
- ✅ 模板系统 (`lib/providers/generic/templates.ts`)
- ✅ 配置管理系统 (`lib/utils/config.ts`)
- ✅ 前端配置界面 (`app/settings/GenericProviderManager.tsx`)

### 1.2 核心问题
1. **模型选择缺失**：当前实现中模型名称是硬编码的（`caller.ts:105`）
   ```typescript
   model: config.templateType === 'openai' ? 'whisper-1' : 'default'
   ```

2. **音色选择不完善**：TTS音色选择是通用的（standard/premium/large-model），不是服务商特定的

3. **参数映射不准确**：OpenAI的参数与当前通用参数不完全匹配

4. **缺少模型元数据**：没有存储每个模型的特性、支持的音色等信息

## 二、OpenAI API 规范

### 2.1 TTS (Text-to-Speech)

#### 端点
```
POST https://api.openai.com/v1/audio/speech
```

#### 可用模型
| 模型 | 特点 | 适用场景 |
|------|------|----------|
| `gpt-4o-mini-tts` | 最新、最可靠，支持提示词控制 | 智能实时应用 |
| `tts-1` | 低延迟 | 实时场景 |
| `tts-1-hd` | 高质量 | 高质量音频生成 |

#### 可用音色（11种）
- `alloy` - 中性音色
- `ash` -
- `ballad` -
- `coral` -
- `echo` -
- `fable` -
- `nova` -
- `onyx` -
- `sage` -
- `shimmer` -

#### 请求参数
```json
{
  "model": "gpt-4o-mini-tts",
  "voice": "coral",
  "input": "文本内容",
  "instructions": "可选：控制语音特征的提示词",
  "response_format": "mp3",  // mp3, opus, aac, flac, wav, pcm
  "speed": 1.0  // 0.25 - 4.0
}
```

#### 响应格式
- 直接返回音频二进制流（不是JSON）
- Content-Type: audio/mpeg (或其他格式)

### 2.2 ASR (Speech-to-Text / Whisper)

#### 端点
```
POST https://api.openai.com/v1/audio/transcriptions
```

#### 可用模型
| 模型 | 特点 |
|------|------|
| `whisper-1` | 通用语音识别模型 |

#### 请求参数（multipart/form-data）
```
file: 音频文件
model: "whisper-1"
language: "zh" (可选，ISO-639-1格式)
prompt: "可选的上下文提示"
response_format: "json" (json, text, srt, verbose_json, vtt)
temperature: 0 (0-1，可选)
```

#### 响应格式
```json
{
  "text": "识别的文本内容"
}
```

## 三、实现方案

### 3.1 架构设计

#### 方案选择：增强型模板系统（推荐）

**核心思想**：在现有模板系统基础上，为每个模板添加模型元数据，让用户可以选择具体的模型和音色。

**优点**：
- ✅ 保持现有架构，改动最小
- ✅ 用户体验好：下拉选择而非手动输入
- ✅ 支持中转站：允许自定义模型名称
- ✅ 易于扩展：添加新服务商只需扩展模板

### 3.2 数据结构设计

#### 3.2.1 模型元数据类型定义

```typescript
// lib/providers/generic/types.ts

/**
 * 模型定义
 */
export interface ModelDefinition {
  id: string;                    // 模型ID，如 'whisper-1'
  name: string;                  // 显示名称，如 'Whisper V1'
  description?: string;          // 模型描述
  type: 'asr' | 'tts';          // 模型类型

  // TTS特有字段
  voices?: VoiceDefinition[];    // 支持的音色列表
  supportedFormats?: string[];   // 支持的音频格式
  speedRange?: [number, number]; // 语速范围，如 [0.25, 4.0]

  // ASR特有字段
  supportedLanguages?: string[]; // 支持的语言代码
  maxFileSize?: number;          // 最大文件大小（字节）
}

/**
 * 音色定义
 */
export interface VoiceDefinition {
  id: string;                    // 音色ID，如 'alloy'
  name: string;                  // 显示名称，如 'Alloy'
  description?: string;          // 音色描述
  gender?: 'male' | 'female' | 'neutral'; // 性别
  language?: string;             // 主要语言
  previewUrl?: string;           // 试听URL
}

/**
 * 增强的API模板
 */
export interface APITemplate {
  // ... 现有字段保持不变

  // 新增：预设模型列表
  models?: ModelDefinition[];

  // 新增：是否允许自定义模型
  allowCustomModel?: boolean;

  // 新增：默认模型
  defaultModel?: {
    asr?: string;  // 默认ASR模型ID
    tts?: string;  // 默认TTS模型ID
  };
}

/**
 * 增强的Provider配置
 */
export interface GenericProviderConfig {
  // ... 现有字段保持不变

  // 新增：用户选择的模型
  selectedModels?: {
    asr?: string;      // 选择的ASR模型ID
    tts?: string;      // 选择的TTS模型ID
  };

  // 新增：用户选择的音色
  selectedVoice?: string;  // 选择的音色ID

  // 新增：自定义模型（当allowCustomModel=true时）
  customModels?: {
    asr?: string;
    tts?: string;
  };
}
```

#### 3.2.2 OpenAI模板定义

```typescript
// lib/providers/generic/templates.ts

export const openaiTemplate: APITemplate = {
  name: 'OpenAI',
  description: 'OpenAI语音服务（Whisper + TTS）',

  // 现有字段
  defaultApiUrl: 'https://api.openai.com/v1/audio',
  defaultMethod: 'POST',
  authType: 'bearer',

  // 新增：模型列表
  models: [
    // ASR模型
    {
      id: 'whisper-1',
      name: 'Whisper V1',
      description: '通用语音识别模型，支持多语言',
      type: 'asr',
      supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi'],
      maxFileSize: 25 * 1024 * 1024, // 25MB
    },

    // TTS模型
    {
      id: 'gpt-4o-mini-tts',
      name: 'GPT-4o Mini TTS',
      description: '最新的TTS模型，支持提示词控制语音特征',
      type: 'tts',
      voices: [
        { id: 'alloy', name: 'Alloy', description: '中性、平衡的音色', gender: 'neutral' },
        { id: 'ash', name: 'Ash', description: '温暖、友好的音色', gender: 'neutral' },
        { id: 'ballad', name: 'Ballad', description: '叙事性、富有表现力', gender: 'neutral' },
        { id: 'coral', name: 'Coral', description: '明亮、活泼的音色', gender: 'female' },
        { id: 'echo', name: 'Echo', description: '清晰、专业的音色', gender: 'male' },
        { id: 'fable', name: 'Fable', description: '讲故事般的音色', gender: 'neutral' },
        { id: 'nova', name: 'Nova', description: '现代、年轻的音色', gender: 'female' },
        { id: 'onyx', name: 'Onyx', description: '深沉、权威的音色', gender: 'male' },
        { id: 'sage', name: 'Sage', description: '智慧、沉稳的音色', gender: 'neutral' },
        { id: 'shimmer', name: 'Shimmer', description: '柔和、温柔的音色', gender: 'female' },
      ],
      supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
      speedRange: [0.25, 4.0],
    },
    {
      id: 'tts-1',
      name: 'TTS Standard',
      description: '标准TTS模型，低延迟',
      type: 'tts',
      voices: [
        { id: 'alloy', name: 'Alloy', gender: 'neutral' },
        { id: 'echo', name: 'Echo', gender: 'male' },
        { id: 'fable', name: 'Fable', gender: 'neutral' },
        { id: 'onyx', name: 'Onyx', gender: 'male' },
        { id: 'nova', name: 'Nova', gender: 'female' },
        { id: 'shimmer', name: 'Shimmer', gender: 'female' },
      ],
      supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
      speedRange: [0.25, 4.0],
    },
    {
      id: 'tts-1-hd',
      name: 'TTS HD',
      description: '高质量TTS模型',
      type: 'tts',
      voices: [
        { id: 'alloy', name: 'Alloy', gender: 'neutral' },
        { id: 'echo', name: 'Echo', gender: 'male' },
        { id: 'fable', name: 'Fable', gender: 'neutral' },
        { id: 'onyx', name: 'Onyx', gender: 'male' },
        { id: 'nova', name: 'Nova', gender: 'female' },
        { id: 'shimmer', name: 'Shimmer', gender: 'female' },
      ],
      supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
      speedRange: [0.25, 4.0],
    },
  ],

  // 允许自定义模型（支持中转站）
  allowCustomModel: true,

  // 默认模型
  defaultModel: {
    asr: 'whisper-1',
    tts: 'gpt-4o-mini-tts',
  },

  // 请求体模板
  requestBodyTemplate: {
    asr: '{"model": "{model}", "language": "{language}"}',
    tts: '{"model": "{model}", "voice": "{voice}", "input": "{text}", "response_format": "{format}", "speed": {speed}}',
  },

  // 响应路径
  responseTextPath: 'text',
  responseAudioPath: '', // 直接返回二进制流
  responseAudioFormat: 'stream',

  errorPath: 'error.message',
};
```

### 3.3 前端界面改进

#### 3.3.1 配置界面增强（GenericProviderManager）

在添加/编辑API配置时，增加模型和音色选择：

```typescript
// 新增状态
const [selectedTemplate, setSelectedTemplate] = useState<APITemplate | null>(null);
const [availableModels, setAvailableModels] = useState<{
  asr: ModelDefinition[];
  tts: ModelDefinition[];
}>({ asr: [], tts: [] });

// 当模板类型改变时，加载可用模型
useEffect(() => {
  if (formData.templateType) {
    const template = templates[formData.templateType];
    setSelectedTemplate(template);

    if (template.models) {
      setAvailableModels({
        asr: template.models.filter(m => m.type === 'asr'),
        tts: template.models.filter(m => m.type === 'tts'),
      });
    }
  }
}, [formData.templateType]);
```

界面新增字段：

```tsx
{/* 模型选择 - ASR */}
{formData.serviceType !== 'tts' && availableModels.asr.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      ASR模型
    </label>
    <select
      value={formData.selectedModels?.asr || ''}
      onChange={(e) => setFormData({
        ...formData,
        selectedModels: { ...formData.selectedModels, asr: e.target.value }
      })}
      className="w-full border border-gray-300 rounded-lg px-3 py-2"
    >
      <option value="">选择模型</option>
      {availableModels.asr.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} - {model.description}
        </option>
      ))}
    </select>
  </div>
)}

{/* 模型选择 - TTS */}
{formData.serviceType !== 'asr' && availableModels.tts.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      TTS模型
    </label>
    <select
      value={formData.selectedModels?.tts || ''}
      onChange={(e) => {
        const modelId = e.target.value;
        setFormData({
          ...formData,
          selectedModels: { ...formData.selectedModels, tts: modelId }
        });
        // 清空音色选择，因为不同模型支持的音色可能不同
        setFormData(prev => ({ ...prev, selectedVoice: '' }));
      }}
      className="w-full border border-gray-300 rounded-lg px-3 py-2"
    >
      <option value="">选择模型</option>
      {availableModels.tts.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} - {model.description}
        </option>
      ))}
    </select>
  </div>
)}

{/* 音色选择 - 根据选择的TTS模型动态显示 */}
{formData.serviceType !== 'asr' && formData.selectedModels?.tts && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      音色
    </label>
    <select
      value={formData.selectedVoice || ''}
      onChange={(e) => setFormData({ ...formData, selectedVoice: e.target.value })}
      className="w-full border border-gray-300 rounded-lg px-3 py-2"
    >
      <option value="">选择音色</option>
      {(() => {
        const model = availableModels.tts.find(m => m.id === formData.selectedModels?.tts);
        return model?.voices?.map(voice => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.gender}) - {voice.description}
          </option>
        ));
      })()}
    </select>
  </div>
)}

{/* 自定义模型（可选） */}
{selectedTemplate?.allowCustomModel && (
  <details>
    <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
      使用自定义模型名称
    </summary>
    <div className="space-y-2 mt-2">
      <input
        type="text"
        placeholder="自定义ASR模型名称"
        value={formData.customModels?.asr || ''}
        onChange={(e) => setFormData({
          ...formData,
          customModels: { ...formData.customModels, asr: e.target.value }
        })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <input
        type="text"
        placeholder="自定义TTS模型名称"
        value={formData.customModels?.tts || ''}
        onChange={(e) => setFormData({
          ...formData,
          customModels: { ...formData.customModels, tts: e.target.value }
        })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  </details>
)}
```

#### 3.3.2 TTS页面改进

在TTS测试页面，根据选择的Provider显示对应的音色列表：

```typescript
// 获取当前Provider的可用音色
const getAvailableVoices = (providerId: string) => {
  const provider = config.providers.find(p => p.id === providerId);
  if (!provider || !provider.templateType) return [];

  const template = templates[provider.templateType];
  if (!template.models) return [];

  const ttsModel = template.models.find(
    m => m.type === 'tts' && m.id === provider.selectedModels?.tts
  );

  return ttsModel?.voices || [];
};
```

### 3.4 后端调用逻辑改进

#### 3.4.1 调用器改进（caller.ts）

```typescript
// lib/providers/generic/caller.ts

export async function callGenericAPI(
  config: GenericProviderConfig,
  serviceType: 'asr' | 'tts',
  params: CallParams
): Promise<CallResult> {
  // 获取模板
  const template = config.templateType ? templates[config.templateType] : null;

  // 确定使用的模型
  let modelId: string;
  if (config.customModels?.[serviceType]) {
    // 优先使用自定义模型
    modelId = config.customModels[serviceType];
  } else if (config.selectedModels?.[serviceType]) {
    // 使用用户选择的模型
    modelId = config.selectedModels[serviceType];
  } else if (template?.defaultModel?.[serviceType]) {
    // 使用模板默认模型
    modelId = template.defaultModel[serviceType];
  } else {
    // 回退到硬编码
    modelId = serviceType === 'asr' ? 'whisper-1' : 'tts-1';
  }

  // 确定使用的音色（TTS）
  let voiceId: string = 'alloy'; // 默认音色
  if (serviceType === 'tts') {
    if (config.selectedVoice) {
      voiceId = config.selectedVoice;
    } else if (template?.models) {
      const model = template.models.find(m => m.id === modelId && m.type === 'tts');
      if (model?.voices && model.voices.length > 0) {
        voiceId = model.voices[0].id; // 使用第一个音色作为默认
      }
    }
  }

  // 构建请求变量
  const variables: RequestVariables = {
    model: modelId,
    voice: voiceId,
    text: params.text || '',
    audio: params.audio || '',
    language: params.language || 'zh',
    format: params.format || 'mp3',
    speed: params.speed || 1.0,
    volume: params.volume || 1.0,
    pitch: params.pitch || 1.0,
  };

  // ... 其余逻辑保持不变
}
```

### 3.5 API路由改进

#### 3.5.1 TTS路由（app/api/tts/route.ts）

```typescript
// 从请求中获取音色参数
const voice = body.voice || provider.selectedVoice || 'alloy';

// 调用通用API
const result = await callGenericAPI(provider, 'tts', {
  text: body.text,
  voice: voice,
  speed: body.speed,
  format: body.format || 'mp3',
});
```

## 四、实施步骤

### 阶段一：类型定义和模板扩展
1. ✅ 扩展类型定义（`types.ts`）
   - 添加 `ModelDefinition`
   - 添加 `VoiceDefinition`
   - 扩展 `APITemplate`
   - 扩展 `GenericProviderConfig`

2. ✅ 更新OpenAI模板（`templates.ts`）
   - 添加完整的模型列表
   - 添加音色定义
   - 设置默认模型

### 阶段二：前端界面改进
3. ✅ 改进配置管理界面（`GenericProviderManager.tsx`）
   - 添加模型选择下拉框
   - 添加音色选择下拉框
   - 添加自定义模型输入框
   - 实现联动逻辑

4. ✅ 改进TTS测试页面（`app/tts/page.tsx`）
   - 根据Provider显示对应音色
   - 传递音色参数到API

5. ✅ 改进ASR测试页面（`app/asr/page.tsx`）
   - 显示模型信息
   - 传递模型参数到API

### 阶段三：后端逻辑改进
6. ✅ 更新调用器（`caller.ts`）
   - 实现模型选择逻辑
   - 实现音色选择逻辑
   - 支持自定义模型

7. ✅ 更新API路由
   - TTS路由传递音色参数
   - ASR路由传递模型参数

### 阶段四：测试和优化
8. ✅ 功能测试
   - 测试OpenAI ASR
   - 测试OpenAI TTS（多个模型）
   - 测试音色切换
   - 测试自定义模型

9. ✅ 用户体验优化
   - 添加模型描述提示
   - 添加音色试听功能（可选）
   - 优化错误提示

## 五、扩展性考虑

### 5.1 支持其他服务商
使用相同的模式，可以轻松添加其他服务商：

```typescript
// Qwen模板示例
export const qwenTemplate: APITemplate = {
  name: 'Qwen',
  models: [
    {
      id: 'qwen-audio-turbo',
      name: 'Qwen Audio Turbo',
      type: 'asr',
      // ...
    },
    // ...
  ],
  // ...
};
```

### 5.2 动态模型发现（未来）
如果服务商提供模型列表API，可以实现动态加载：

```typescript
// 未来功能：从API获取模型列表
async function fetchAvailableModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return response.json();
}
```

## 六、兼容性和迁移

### 6.1 向后兼容
- 现有配置不会失效
- 未选择模型时使用默认模型
- 未选择音色时使用默认音色

### 6.2 配置迁移
```typescript
// 自动迁移旧配置
function migrateConfig(oldConfig: any): GenericProviderConfig {
  return {
    ...oldConfig,
    selectedModels: {
      asr: oldConfig.templateType === 'openai' ? 'whisper-1' : undefined,
      tts: oldConfig.templateType === 'openai' ? 'gpt-4o-mini-tts' : undefined,
    },
    selectedVoice: 'alloy', // 默认音色
  };
}
```

## 七、总结

### 优势
1. **用户友好**：下拉选择而非手动输入，降低使用门槛
2. **灵活性高**：支持预设模型和自定义模型，兼顾易用性和灵活性
3. **易于扩展**：添加新服务商只需扩展模板定义
4. **向后兼容**：不影响现有配置和功能
5. **架构清晰**：模型元数据与调用逻辑分离，便于维护

### 下一步
1. 实现OpenAI集成（本方案）
2. 测试和优化
3. 添加其他服务商（Qwen、豆包等）
4. 考虑添加音色试听功能
5. 考虑添加模型性能对比功能

---

**方案制定时间**：2025-12-09
**预计实施时间**：2-3天
**优先级**：高
