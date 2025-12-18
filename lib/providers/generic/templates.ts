/**
 * 预设API模板
 */

import { APITemplate, TemplateType, GenericProviderConfig, ModelDefinition, VoiceDefinition } from './types';

/**
 * OpenAI TTS音色定义
 */
const openaiVoices: VoiceDefinition[] = [
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
];

/**
 * OpenAI TTS标准音色（6种，用于tts-1和tts-1-hd）
 */
const openaiStandardVoices: VoiceDefinition[] = [
  { id: 'alloy', name: 'Alloy', description: '中性、平衡的音色', gender: 'neutral' },
  { id: 'echo', name: 'Echo', description: '清晰、专业的音色', gender: 'male' },
  { id: 'fable', name: 'Fable', description: '讲故事般的音色', gender: 'neutral' },
  { id: 'onyx', name: 'Onyx', description: '深沉、权威的音色', gender: 'male' },
  { id: 'nova', name: 'Nova', description: '现代、年轻的音色', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', description: '柔和、温柔的音色', gender: 'female' },
];

/**
 * OpenAI模型定义
 */
const openaiModels: ModelDefinition[] = [
  // ASR模型
  {
    id: 'whisper-1',
    name: 'Whisper V1',
    description: '通用语音识别模型，支持多语言',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  // TTS模型
  {
    id: 'gpt-4o-mini-tts',
    name: 'GPT-4o Mini TTS',
    description: '最新的TTS模型，支持提示词控制语音特征（口音、情感、语调等）',
    type: 'tts',
    voices: openaiVoices,
    supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
    speedRange: [0.25, 4.0],
  },
  {
    id: 'tts-1',
    name: 'TTS Standard',
    description: '标准TTS模型，低延迟，适合实时场景',
    type: 'tts',
    voices: openaiStandardVoices,
    supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
    speedRange: [0.25, 4.0],
  },
  {
    id: 'tts-1-hd',
    name: 'TTS HD',
    description: '高质量TTS模型，音质更好',
    type: 'tts',
    voices: openaiStandardVoices,
    supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
    speedRange: [0.25, 4.0],
  },
];

/**
 * OpenAI风格模板
 * 适用于：OpenAI Whisper, DeepSeek, Moonshot等兼容OpenAI API的服务
 */
export const openaiTemplate: APITemplate = {
  id: 'openai',
  name: 'OpenAI风格',
  description: '适用于OpenAI Whisper、DeepSeek、Moonshot等兼容OpenAI API格式的服务',
  defaultApiUrl: 'https://api.openai.com/v1',
  defaultMethod: 'POST',
  authType: 'bearer',
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      model: '{model}',
      file: '{audio}',
      language: '{language}',
      response_format: 'json',
    }, null, 2),
    tts: JSON.stringify({
      model: '{model}',
      input: '{text}',
      voice: '{voice}',
      response_format: 'mp3',
      speed: '{speed}',
    }, null, 2),
  },
  responseTextPath: 'text',
  responseAudioPath: '', // OpenAI TTS直接返回音频流
  responseAudioFormat: 'stream',
  errorPath: 'error.message',
  variables: [
    { description: '模型名称（如：whisper-1, tts-1）', required: true, default: 'whisper-1' },
    { description: '语言代码（如：zh, en）', required: false, default: 'zh' },
  ],

  // 新增：模型列表
  models: openaiModels,

  // 新增：允许自定义模型（支持中转站）
  allowCustomModel: true,

  // 新增：默认模型
  defaultModel: {
    asr: 'whisper-1',
    tts: 'gpt-4o-mini-tts',
  },
};

/**
 * Qwen3-TTS-Flash 音色定义
 * 注意：Qwen3-TTS-Flash 支持 49 种音色，以下是已确认的部分音色
 * 完整列表请参考官方文档：https://help.aliyun.com/zh/model-studio/qwen-tts
 * 
 * 说明：DashScope API 中只有 qwen3-tts-flash 这一个可用的模型名称。
 * 虽然理论上存在 Qwen3-TTS（17种音色）和 Qwen3-TTS-Flash（49种音色）两个版本，
 * 但在实际API调用中，都使用 qwen3-tts-flash 这个模型名称。
 */
const qwen3FlashVoices: VoiceDefinition[] = [
  { id: 'Cherry', name: '芊悦', description: '阳光积极、亲切自然的小姐姐', gender: 'female' },
  { id: 'Ethan', name: '晨煦', description: '标准普通话，带部分北方口音。阳光、温暖、活力、朝气', gender: 'male' },
  { id: 'Nofish', name: '不吃鱼', description: '不会翘舌音的设计师', gender: 'neutral' },
  { id: 'Jennifer', name: '詹妮弗', description: '品牌级、电影质感般的美语女声', gender: 'female' },
  { id: 'Ryan', name: '甜茶', description: '节奏拉满，戏感炸裂，真实与张力共舞', gender: 'male' },
  { id: 'Chelsie', name: '千雪', description: '二次元虚拟女友', gender: 'female' },
  { id: 'Sunny', name: '四川-晴儿', description: '甜到你心里的川妹子', gender: 'female' },
  { id: 'Jada', name: '上海-阿珍', description: '风风火火的沪上阿姐', gender: 'female' },
  { id: 'Dylan', name: '北京-晓东', description: '北京胡同里长大的少年', gender: 'male' },
  // 注意：Serena 可能在 qwen3-tts-flash 中不支持，仅在旧版本或其他模型中支持
  // Qwen3-TTS-Flash 总共支持 49 种音色，完整列表请参考官方文档
];

/**
 * Qwen模型定义
 * 
 * 注意：DashScope API 中只有 qwen3-tts-flash 这一个可用的TTS模型名称。
 * 虽然理论上存在 Qwen3-TTS（17种音色）和 Qwen3-TTS-Flash（49种音色）两个版本，
 * 但在实际API调用中，都使用 qwen3-tts-flash 这个模型名称。
 * 如果使用 qwen3-tts 会返回 "Model not exist." 错误。
 */
const qwenModels: ModelDefinition[] = [
  // ASR模型
  {
    id: 'paraformer-v2',
    name: 'Paraformer V2',
    description: '阿里云通义千问语音识别模型，支持多语言，高准确率',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  // TTS模型 - Qwen3-TTS-Flash（唯一可用的模型）
  {
    id: 'qwen3-tts-flash',
    name: 'Qwen3-TTS Flash',
    description: 'Qwen3-TTS 模型，低延迟（首包延迟97ms），支持流式输出，提供49种音色。注意：DashScope API中只有此模型可用',
    type: 'tts',
    voices: qwen3FlashVoices,
    supportedFormats: ['mp3', 'wav', 'pcm'],
    speedRange: [0.5, 2.0],
  },
];

/**
 * Qwen风格模板
 * 适用于：通义千问ASR/TTS，包括最新的Qwen3-TTS
 *
 * 注意：
 * - ASR使用 paraformer-v2 模型，通过 /services/audio/asr/recognition 端点
 * - TTS使用 qwen3-tts-flash 模型，通过 /services/aigc/multimodal-generation/generation 端点
 */
export const qwenTemplate: APITemplate = {
  id: 'qwen',
  name: 'Qwen风格',
  description: '适用于阿里云通义千问ASR/TTS服务，包括Qwen3-TTS',
  defaultApiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  defaultMethod: 'POST',
  authType: 'bearer', // DashScope 使用 Bearer Token 认证
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      model: '{model}',
      input: {
        audio: '{audioBase64}',
      },
      parameters: {},
    }, null, 2),
    tts: JSON.stringify({
      model: '{model}',
      input: {
        text: '{text}',
        voice: '{voice}',
        language_type: '{language_type}',
      },
    }, null, 2),
  },
  responseTextPath: 'output.text',
  responseAudioPath: 'output.audio.data', // Qwen3-TTS 音频数据在 output.audio.data 中（如果为空，会从 output.audio.url 下载）
  responseAudioFormat: 'base64', // 如果data为空，会自动从url下载
  errorPath: 'message',
  variables: [
    { description: '模型名称（如：paraformer-v2, qwen3-tts-flash）', required: true, default: 'qwen3-tts-flash' },
    { description: '语言代码', required: false, default: 'zh' },
  ],

  // 新增：模型列表
  models: qwenModels,

  // 新增：允许自定义模型（支持中转站）
  allowCustomModel: true,

  // 新增：默认模型
  defaultModel: {
    asr: 'paraformer-v2',
    tts: 'qwen3-tts-flash',
  },
};

/**
 * Cartesia 音色定义
 * 注意：这是初期硬编码的常用音色列表，后续可通过 /voices API 动态获取
 */
const cartesiaVoices: VoiceDefinition[] = [
  {
    id: '694f9389-aac1-45b6-b726-9d9369183238',
    name: 'British Lady',
    description: 'Professional British female voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    name: 'Barbershop Man',
    description: 'Warm and friendly male voice',
    gender: 'male',
    language: 'en'
  },
  {
    id: '79a125e8-cd45-4c13-8a67-188112f4dd22',
    name: 'Calm Lady',
    description: 'Calm and soothing female voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: '87748186-23bb-4158-a1eb-332911b0b708',
    name: 'Newsman',
    description: 'Professional news anchor male voice',
    gender: 'male',
    language: 'en'
  },
  {
    id: '2ee87190-8f84-4925-97da-e52547f9462c',
    name: 'Storyteller Lady',
    description: 'Expressive storytelling female voice',
    gender: 'female',
    language: 'en'
  },
];

/**
 * Cartesia 模型定义
 * 注意：Cartesia 仅支持 TTS，不支持 ASR
 */
const cartesiaModels: ModelDefinition[] = [
  {
    id: 'sonic-3',
    name: 'Sonic 3',
    description: 'Latest Sonic model with improved quality and naturalness',
    type: 'tts',
    voices: cartesiaVoices,
    supportedFormats: ['wav', 'pcm', 'mp3', 'flac', 'mulaw'],
    speedRange: [0.5, 2.0],
  },
  {
    id: 'sonic-english',
    name: 'Sonic English',
    description: 'Optimized for English language synthesis',
    type: 'tts',
    voices: cartesiaVoices,
    supportedFormats: ['wav', 'pcm', 'mp3', 'flac', 'mulaw'],
    speedRange: [0.5, 2.0],
  },
  {
    id: 'sonic-multilingual',
    name: 'Sonic Multilingual',
    description: 'Supports multiple languages',
    type: 'tts',
    voices: cartesiaVoices,
    supportedFormats: ['wav', 'pcm', 'mp3', 'flac', 'mulaw'],
    speedRange: [0.5, 2.0],
  },
];

/**
 * 豆包风格模板
 * 适用于：字节跳动豆包语音服务
 */
export const doubaoTemplate: APITemplate = {
  id: 'doubao',
  name: '豆包风格',
  description: '适用于字节跳动火山引擎豆包语音识别/合成服务',
  defaultApiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  defaultMethod: 'POST',
  authType: 'bearer',
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      model: '{model}',
      audio: '{audio}',
      language: '{language}',
      format: '{format}',
    }, null, 2),
    tts: JSON.stringify({
      model: '{model}',
      text: '{text}',
      voice: '{voice}',
      speed: '{speed}',
      volume: '{volume}',
    }, null, 2),
  },
  responseTextPath: 'result.text',
  responseAudioPath: 'result.audio',
  responseAudioFormat: 'base64',
  errorPath: 'error.message',
  variables: [
    { description: '模型名称', required: true, default: 'doubao-asr' },
    { description: '语言代码', required: false, default: 'zh' },
  ],
};

/**
 * Cartesia 风格模板
 * 适用于：Cartesia TTS API
 * 注意：
 * - Cartesia 仅支持 TTS，不支持 ASR
 * - 使用 X-API-Key 认证
 * - 需要 Cartesia-Version header
 * - 响应直接返回音频流
 */
export const cartesiaTemplate: APITemplate = {
  id: 'cartesia',
  name: 'Cartesia风格',
  description: '适用于 Cartesia TTS API，支持高质量语音合成',
  defaultApiUrl: 'https://api.cartesia.ai/tts/bytes',
  defaultMethod: 'POST',
  authType: 'apikey',
  isBuiltin: true,
  requestBodyTemplate: {
    // Cartesia 不支持 ASR
    asr: undefined,
    // TTS 请求体模板
    // 注意：这里使用占位符，实际请求时需要在 caller.ts 中特殊处理 voice 对象
    tts: JSON.stringify({
      model_id: '{model}',
      transcript: '{text}',
      voice: {
        mode: 'id',
        id: '{voice}',
      },
      output_format: {
        container: 'mp3',
        encoding: 'mp3',
        sample_rate: 44100,
      },
      language: '{language}',
      speed: '{speed}',
    }, null, 2),
  },
  responseTextPath: undefined, // Cartesia 不支持 ASR
  responseAudioPath: '', // 直接返回音频流
  responseAudioFormat: 'stream',
  errorPath: 'error.message',
  variables: [
    { description: '模型名称（如：sonic-3, sonic-english）', required: true, default: 'sonic-3' },
    { description: '音色ID', required: true, default: '694f9389-aac1-45b6-b726-9d9369183238' },
    { description: '语言代码（如：en, zh）', required: false, default: 'en' },
  ],

  // 模型列表
  models: cartesiaModels,

  // 不允许自定义模型（Cartesia 有固定的模型列表）
  allowCustomModel: false,

  // 默认模型
  defaultModel: {
    asr: undefined, // 不支持 ASR
    tts: 'sonic-3',
  },
};

/**
 * 自定义模板（完全自定义）
 */
export const customTemplate: APITemplate = {
  id: 'custom',
  name: '自定义',
  description: '完全自定义API格式，适用于任何兼容的API',
  defaultApiUrl: '',
  defaultMethod: 'POST',
  authType: 'bearer',
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      // 自定义ASR请求格式
      // 使用变量：{text}, {audio}, {audioBase64}, {model}, {language}, {format}等
    }, null, 2),
    tts: JSON.stringify({
      // 自定义TTS请求格式
      // 使用变量：{text}, {model}, {voice}, {speed}, {volume}, {pitch}等
    }, null, 2),
  },
  responseTextPath: 'text', // 默认路径，用户可修改
  responseAudioPath: 'audio',
  responseAudioFormat: 'base64',
  errorPath: 'error.message',
  variables: [],
};

/**
 * 所有模板
 */
export const templates: Record<TemplateType, APITemplate> = {
  openai: openaiTemplate,
  qwen: qwenTemplate,
  doubao: doubaoTemplate,
  cartesia: cartesiaTemplate,
  custom: customTemplate,
};

/**
 * 根据模板类型获取模板（同步版本，用于向后兼容）
 * @deprecated 使用 template-loader.ts 中的异步 getTemplate 函数
 */
export function getTemplate(templateType: TemplateType): APITemplate {
  return templates[templateType] || customTemplate;
}

/**
 * 根据模板创建默认配置
 */
export function createConfigFromTemplate(
  templateType: TemplateType,
  name: string,
  apiKey?: string,
  customApiUrl?: string
): Partial<GenericProviderConfig> {
  const template = getTemplate(templateType);
  
  return {
    name,
    type: 'generic',
    templateType,
    apiUrl: customApiUrl || template.defaultApiUrl,
    method: template.defaultMethod,
    authType: template.authType,
    apiKey: apiKey || '',
    requestBody: template.requestBodyTemplate.asr || template.requestBodyTemplate.tts,
    responseTextPath: template.responseTextPath,
    responseAudioPath: template.responseAudioPath,
    responseAudioFormat: template.responseAudioFormat,
    errorPath: template.errorPath,
    enabled: true,
  };
}
