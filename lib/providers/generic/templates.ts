/**
 * 预设API模板
 */

import { APITemplate, TemplateType, GenericProviderConfig, ModelDefinition, VoiceDefinition } from './types';
import { getMinimaxVoices, getCachedVoices } from '../minimax-voices';

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
    id: 'gpt-4o-mini-transcribe-2025-12-15',
    name: 'GPT-4o Mini Transcribe (2025-12-15)',
    description: 'GPT-4o Mini Transcribe 官方快照版本',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
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
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.25, 4.0],
  },
  {
    id: 'tts-1',
    name: 'TTS Standard',
    description: '标准TTS模型，低延迟，适合实时场景',
    type: 'tts',
    voices: openaiStandardVoices,
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.25, 4.0],
  },
  {
    id: 'tts-1-hd',
    name: 'TTS HD',
    description: '高质量TTS模型，音质更好',
    type: 'tts',
    voices: openaiStandardVoices,
    supportedFormats: ['wav', 'pcm'],
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
    tts: `{
  "model": "{model}",
  "input": "{text}",
  "voice": "{voice}",
  "response_format": "wav",
  "speed": {speed},
  "sample_rate": {sample_rate}
}`,
  },
  responseTextPath: 'text',
  responseAudioPath: '', // OpenAI TTS直接返回音频流
  responseAudioFormat: 'stream',
  errorPath: 'error.message',
  variables: [
    { description: '模型名称（如：gpt-4o-mini-transcribe-2025-12-15, whisper-1, tts-1）', required: true, default: 'gpt-4o-mini-transcribe-2025-12-15' },
    { description: '语言代码（如：zh, en）', required: false, default: 'zh' },
  ],

  // 新增：模型列表
  models: openaiModels,

  // 新增：允许自定义模型（支持中转站）
  allowCustomModel: true,

  // 新增：默认模型
  defaultModel: {
    asr: 'gpt-4o-mini-transcribe-2025-12-15',
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
    id: 'qwen3-asr-flash',
    name: 'Qwen3-ASR Flash',
    description: 'Qwen3 快速语音识别模型，支持多语言自动识别，低延迟',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it'],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  // TTS模型 - Qwen3-TTS-Flash（唯一可用的模型）
  {
    id: 'qwen3-tts-flash',
    name: 'Qwen3-TTS Flash',
    type: 'tts',
    voices: qwen3FlashVoices,
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.5, 2.0],
  },
];

/**
 * Qwen风格模板
 * 适用于：通义千问ASR/TTS，包括最新的Qwen3-TTS
 *
 * 注意：
 * - ASR使用 qwen3-asr-flash 模型，通过 /services/aigc/multimodal-generation/generation 端点
 * - TTS使用 qwen3-tts-flash 模型，通过 /services/aigc/multimodal-generation/generation 端点
 */
export const qwenTemplate: APITemplate = {
  id: 'qwen',
  name: 'Qwen风格',
  description: '适用于阿里云通义千问ASR/TTS服务，包括Qwen3-TTS',
  defaultApiUrl: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
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
    { description: '模型名称（如：qwen3-asr-flash, qwen3-tts-flash）', required: true, default: 'qwen3-tts-flash' },
    { description: '语言代码', required: false, default: 'zh' },
  ],

  // 新增：模型列表
  models: qwenModels,

  // 新增：允许自定义模型（支持中转站）
  allowCustomModel: true,

  // 新增：默认模型
  defaultModel: {
    asr: 'qwen3-asr-flash',
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
  {
    id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b',
    name: 'Brooklyn',
    description: 'Sonic3 voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
    name: 'Katie',
    description: 'Sonic3 voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: '47c38ca4-5f35-497b-b1a3-415245fb35e1',
    name: 'Daniel',
    description: 'Sonic3 modern assistant voice',
    gender: 'male',
    language: 'en'
  },
  {
    id: 'a01c369f-6d2d-4185-bc20-b32c225eab70',
    name: 'Fiona',
    description: 'Sonic3 voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: 'e8e5fffb-252c-436d-b842-8879b84445b6',
    name: 'Casey',
    description: 'Sonic3 voice',
    gender: 'female',
    language: 'en'
  },
  {
    id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
    name: 'Jacqueline',
    description: 'Sonic3 voice',
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
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.5, 2.0],
  },
  {
    id: 'sonic-english',
    name: 'Sonic English',
    description: 'Optimized for English language synthesis',
    type: 'tts',
    voices: cartesiaVoices,
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.5, 2.0],
  },
  {
    id: 'sonic-multilingual',
    name: 'Sonic Multilingual',
    description: 'Supports multiple languages',
    type: 'tts',
    voices: cartesiaVoices,
    supportedFormats: ['wav', 'pcm'],
    speedRange: [0.5, 2.0],
  },
];
/**
 * 豆包模型定义
 */
const doubaoModels: ModelDefinition[] = [
  // ASR模型 - 极速版
  {
    id: 'bigmodel-flash',
    name: '豆包录音文件识别极速版',
    description: '基于大模型的录音文件识别服务,极速返回,不支持语言参数',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'yue', 'wuu', 'nan', 'hsn', 'sxn'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  // ASR模型 - 标准版
  {
    id: 'bigmodel',
    name: '豆包录音文件识别标准版',
    description: '基于大模型的录音文件识别服务,支持语言参数,支持多语言识别',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'yue', 'wuu', 'nan', 'hsn', 'sxn'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
];

/**
 * 豆包风格模板
 * 适用于：字节跳动豆包语音服务 - 录音文件识别2.0
 *
 * API文档: https://www.volcengine.com/docs/6561/1631584
 *
 * 注意:
 * - 使用自定义Header认证 (X-Api-App-Key, X-Api-Access-Key, X-Api-Resource-Id)
 * - 音频通过Base64编码直接上传
 * - 支持多种音频格式: wav, mp3, ogg, pcm等
 * - 支持多语言自动识别
 */
export const doubaoTemplate: APITemplate = {
  id: 'doubao',
  name: '豆包风格',
  description: '适用于字节跳动火山引擎豆包语音识别服务(录音文件识别2.0)',
  defaultApiUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
  defaultMethod: 'POST',
  authType: 'custom', // 使用自定义认证方式
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      user: {
        uid: '{uid}',
      },
      audio: {
        data: '{audioBase64}',
      },
      request: {
        model_name: '{model}',
        language: '{language}',
        enable_itn: true,
        enable_punc: true,
      },
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
  errorPath: 'header.message',
  variables: [
    { description: '模型名称(bigmodel)', required: true, default: 'bigmodel' },
    { description: '用户ID', required: false, default: 'user_001' },
  ],

  // 模型列表
  models: doubaoModels,

  // 允许自定义模型
  allowCustomModel: false,

  // 默认模型
  defaultModel: {
    asr: 'bigmodel',
    tts: undefined, // 暂不支持TTS
  },
};

/**
 * Azure Speech 模型定义
 */
const azureModels: ModelDefinition[] = [
  // ASR模型
  {
    id: 'azure-stt-multilingual',
    name: 'Azure Speech to Text (多语言)',
    description: 'Azure 语音识别服务，支持140+语言自动识别，使用 Fast Transcription API',
    type: 'asr',
    supportedLanguages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE', 'ru-RU', 'ar-SA', 'hi-IN', 'pt-BR', 'it-IT'],
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
];

/**
 * Azure 风格模板
 * 适用于：Microsoft Azure Speech Service - Fast Transcription API
 *
 * API文档: https://learn.microsoft.com/azure/ai-services/speech-service/fast-transcription-create
 *
 * 注意:
 * - 使用 Fast Transcription API (2025-10-15 版本)
 * - 使用 Ocp-Apim-Subscription-Key 认证
 * - 支持多语言自动识别（无需指定语言参数）
 * - 音频通过 Base64 编码上传
 * - 支持多种音频格式: wav, mp3, ogg, flac, opus 等
 * - 支持的区域: eastus, southeastasia, westeurope, centralindia
 */
export const azureTemplate: APITemplate = {
  id: 'azure',
  name: 'Azure风格',
  description: '适用于 Microsoft Azure 语音识别服务 (Fast Transcription API)，支持140+语言自动识别',
  defaultApiUrl: 'https://{region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15',
  defaultMethod: 'POST',
  authType: 'custom', // 使用自定义认证方式 (Ocp-Apim-Subscription-Key)
  isBuiltin: true,
  requestBodyTemplate: {
    asr: JSON.stringify({
      audio: {
        data: '{audioBase64}',
      },
      locales: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
    }, null, 2),
    tts: undefined, // Azure 暂不支持 TTS（或需要单独配置）
  },
  responseTextPath: 'combinedPhrases[0].text',
  responseAudioPath: undefined,
  responseAudioFormat: undefined,
  errorPath: 'error.message',
  variables: [
    { description: '模型名称', required: true, default: 'azure-stt-multilingual' },
    { description: 'Azure 区域（如：eastus, southeastasia）', required: true, default: 'eastus' },
  ],

  // 模型列表
  models: azureModels,

  // 不允许自定义模型
  allowCustomModel: false,

  // 默认模型
  defaultModel: {
    asr: 'azure-stt-multilingual',
    tts: undefined, // 暂不支持TTS
  },
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
        container: 'wav',
        encoding: 'pcm_s16le',
        sample_rate: 24000,
      },
      generation_config: {
        speed: '{speed}',
      },
      language: '{language}',
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
 * 获取 Minimax 音色列表（动态）
 * 优先使用缓存的音色列表，如果缓存无效则返回默认列表
 * 前端可以通过 /api/providers/minimax/voices 端点查询最新音色列表
 */
export async function getMinimaxVoicesDynamic(): Promise<VoiceDefinition[]> {
  // 尝试从缓存获取
  const cached = getCachedVoices();
  if (cached && cached.length > 0) {
    return cached;
  }
  
  // 如果缓存无效，尝试查询 API（异步，不阻塞）
  const apiKey = process.env.MINIMAX_API_KEY;
  if (apiKey) {
    getMinimaxVoices(apiKey, false).catch(err => {
      console.warn('⚠️ 异步查询 Minimax 音色失败:', err.message);
    });
  }
  
  // 返回默认音色列表
  return getDefaultMinimaxVoices();
}

/**
 * 获取默认 Minimax 音色列表（当 API 查询失败时使用）
 */
function getDefaultMinimaxVoices(): VoiceDefinition[] {
  return [
    {
      id: 'male-qn-qingse',
      name: '青涩（男声）',
      description: '官方文档示例音色，已验证可用（speech-02-turbo 支持）',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'female-qn-qingqing',
      name: '清卿（女声）',
      description: '清新甜美，适合儿童内容、绘本朗读',
      gender: 'female',
      language: 'zh'
    },
  ];
}

/**
 * Gemini 模型定义
 * 参考：https://ai.google.dev/gemini-api/docs/audio
 */
const geminiModels: ModelDefinition[] = [
  // ASR模型
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: '高性能多模态模型，支持音频转录、摘要和翻译，可处理长达8.4小时的音频',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it', 'nl', 'pl', 'tr', 'uk', 'sv', 'da', 'no', 'fi'],
    maxFileSize: 100 * 1024 * 1024, // 100MB (估计值)
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash Preview',
    description: '最新的 Gemini 模型，提供更快的性能和更低的成本，支持高级推理和多模态理解',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it', 'nl', 'pl', 'tr', 'uk', 'sv', 'da', 'no', 'fi'],
    maxFileSize: 100 * 1024 * 1024, // 100MB (估计值)
  },
];

/**
 * Gemini 风格模板
 * 适用于：Google Vertex AI Gemini API (Audio Transcription)
 *
 * API文档: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini
 *
 * 注意:
 * - 使用 Vertex AI 服务账号认证（OAuth2）
 * - 支持 base64 编码的音频数据（inline_data）
 * - 通过 prompt 控制转录行为（如：语言检测、时间戳、说话人识别等）
 * - 支持多语言自动识别和翻译
 * - 可处理长达约 8.4 小时的音频文件
 * - URL 格式: https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/{model}:generateContent
 */
export const geminiTemplate: APITemplate = {
  id: 'gemini',
  name: 'Gemini风格',
  description: '适用于 Google Vertex AI Gemini 语音识别服务，支持多语言、长音频转录',
  defaultApiUrl: 'https://global-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/{model}:generateContent',
  defaultMethod: 'POST',
  authType: 'custom', // 使用 custom 类型，通过 OAuth2 Bearer Token 认证
  isBuiltin: true,
  requestBodyTemplate: {
    // Gemini 使用特殊的多模态格式
    asr: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: '{mimeType}',
                data: '{audioBase64}'
              }
            },
            {
              text: 'Transcribe this audio file accurately. Provide the transcription text only.'
            }
          ]
        }
      ]
    }, null, 2),
    tts: undefined, // Gemini 主要用于 ASR，TTS 功能有限
  },
  responseTextPath: 'candidates.0.content.parts.0.text',
  responseAudioPath: undefined,
  responseAudioFormat: undefined,
  errorPath: 'error.message',
  variables: [
    { description: '模型名称（如：gemini-2.5-flash, gemini-3-flash）', required: true, default: 'gemini-2.5-flash' },
    { description: '语言代码（如：zh, en）', required: false, default: 'zh' },
  ],

  // 模型列表
  models: geminiModels,

  // 允许自定义模型
  allowCustomModel: true,

  // 默认模型
  defaultModel: {
    asr: 'gemini-2.5-flash',
    tts: undefined, // 不支持 TTS
  },
};

/**
 * Deepgram 模型定义
 * 参考：https://developers.deepgram.com/docs/models-overview
 */
const deepgramModels: ModelDefinition[] = [
  // ASR模型
  {
    id: 'nova-3',
    name: 'Nova-3',
    description: '最高性能的通用ASR模型，支持多语言、说话人分离、词级时间戳等高级功能',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it', 'nl', 'pl', 'tr', 'uk', 'sv', 'da', 'no', 'fi'],
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  {
    id: 'nova-2',
    name: 'Nova-2',
    description: '高性能ASR模型，支持更多语言和填充词识别',
    type: 'asr',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'hi', 'pt', 'it', 'nl', 'pl', 'tr', 'uk', 'sv', 'da', 'no', 'fi'],
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  {
    id: 'base',
    name: 'Base',
    description: '基础ASR模型，适合一般场景',
    type: 'asr',
    supportedLanguages: ['en'],
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
];

/**
 * Minimax 音色定义（默认列表，用于模板初始化）
 * 注意：实际可用音色应通过 /api/providers/minimax/voices 端点查询
 * 参考：https://platform.minimaxi.com/docs/api-reference/voice-management-get
 */
const minimaxVoices: VoiceDefinition[] = [
  {
    id: 'male-qn-qingse',
    name: '青涩（男声）',
    description: '标准男声音色',
    gender: 'male',
    language: 'zh'
  },
  {
    id: 'female-qn-qingqing',
    name: '清卿（女声）',
    description: '清新甜美，适合儿童内容、绘本朗读',
    gender: 'female',
    language: 'zh'
  },
  {
    id: 'male-qn-qingqing',
    name: '启明（男声）',
    description: '温暖磁性，标准播音腔',
    gender: 'male',
    language: 'zh'
  },
  {
    id: 'female-xiaoyu',
    name: '小语（女声）',
    description: '活泼可爱，二次元感强',
    gender: 'female',
    language: 'zh'
  },
  {
    id: 'female-aisiyi',
    name: '爱思忆（女声）',
    description: '情感丰富，适合故事讲述',
    gender: 'female',
    language: 'zh'
  },
  {
    id: 'female-beijing',
    name: '北京妞儿（女声）',
    description: '带京味儿口音，市井气息浓',
    gender: 'female',
    language: 'zh'
  },
  {
    id: 'male-sichuan',
    name: '川哥（男声）',
    description: '四川话，幽默接地气',
    gender: 'male',
    language: 'zh'
  },
  {
    id: 'female-guangdong',
    name: '粤妹（女声）',
    description: '粤语原生发音，可用于港澳地区应用',
    gender: 'female',
    language: 'zh'
  },
];

/**
 * Minimax 模型定义
 * 注意：仅保留已验证可用的模型
 */
const minimaxModels: ModelDefinition[] = [
  {
    id: 'speech-02-turbo',
    name: 'Minimax Speech 02 Turbo',
    description: '拥有出色的韵律和稳定性，小语种能力加强，性能表现出色',
    type: 'tts',
    voices: minimaxVoices,
    supportedFormats: ['wav'],
    speedRange: [0.5, 2.0],
  },
];

/**
 * Minimax 风格模板
 * 适用于：Minimax TTS API
 * 注意：
 * - Minimax 使用 WebSocket 流式接口，需要特殊处理
 * - 使用 appid + token 认证
 * - 仅支持 TTS，不支持 ASR
 * - 文本长度限制：≤ 300 字符
 */
export const minimaxTemplate: APITemplate = {
  id: 'minimax',
  name: 'Minimax风格',
  description: '适用于 Minimax TTS API，使用 WebSocket 流式接口，高自然度中文语音合成',
  defaultApiUrl: 'wss://api.minimaxi.com/v1/tts/stream',
  defaultMethod: 'POST', // WebSocket 实际不使用，但保持类型兼容
  authType: 'custom', // 使用 appid + token，非标准认证
  isBuiltin: true,
  requestBodyTemplate: {
    // Minimax 不支持 ASR
    asr: undefined,
    // TTS 请求体模板（注意：这是 WebSocket 消息格式，不是 HTTP 请求体）
    // 实际请求在 callMinimaxTTS 中构建
    tts: JSON.stringify({
      app: {
        appid: '{appId}',
        token: '{apiKey}',
      },
      user: {
        uid: '{uid}',
      },
      content: {
        text: '{text}',
        model: '{model}', // 使用变量，支持所有模型
        voice_setting: {
          voice_id: '{voice}',
          speed_ratio: '{speed}',
          pitch_ratio: 1.0,
          volume_ratio: 1.0,
          encoding: 'wav',
          sample_rate: 24000,
        },
      },
    }, null, 2),
  },
  responseTextPath: undefined, // Minimax 不支持 ASR
  responseAudioPath: '', // WebSocket 流式响应，在 callMinimaxTTS 中处理
  responseAudioFormat: 'stream',
  errorPath: 'msg',
  variables: [
    { description: 'AppID（从控制台获取）', required: true, default: '' },
    { description: 'Token（访问密钥）', required: true, default: '' },
    { description: '音色ID', required: true, default: 'male-qn-qingse' },
  ],

  // 模型列表
  models: minimaxModels,

  // 不允许自定义模型（仅支持已验证的 speech-02-turbo）
  allowCustomModel: false,

  // 默认模型
  defaultModel: {
    asr: undefined, // 不支持 ASR
    tts: 'speech-02-turbo', // 使用推荐的默认模型
  },
};

/**
 * Deepgram 风格模板
 * 适用于：Deepgram Speech-to-Text API (Pre-recorded Audio)
 *
 * API文档: https://developers.deepgram.com/docs/pre-recorded-audio
 *
 * 注意:
 * - 使用 Bearer Token 认证（Authorization: Token YOUR_API_KEY）
 * - 直接上传二进制音频数据（不使用 JSON）
 * - 通过 URL 查询参数传递模型和配置（如：?model=nova-3&smart_format=true）
 * - 支持多语言自动识别
 * - 支持说话人分离、词级时间戳等高级功能
 * - 最大文件大小：2GB
 */
export const deepgramTemplate: APITemplate = {
  id: 'deepgram',
  name: 'Deepgram风格',
  description: '适用于 Deepgram 语音识别服务，支持多语言、高精度转录',
  defaultApiUrl: 'https://api.deepgram.com/v1/listen',
  defaultMethod: 'POST',
  authType: 'bearer',
  isBuiltin: true,
  requestBodyTemplate: {
    // Deepgram 使用二进制上传，不需要 JSON 请求体模板
    // 在 caller.ts 中会特殊处理
    asr: undefined,
    tts: undefined, // Deepgram 不支持 TTS
  },
  responseTextPath: 'result.text',
  responseAudioPath: undefined,
  responseAudioFormat: undefined,
  errorPath: 'err_msg',
  variables: [
    { description: '模型名称（如：nova-3, nova-2, base）', required: true, default: 'nova-3' },
    { description: '语言代码（如：zh, en）', required: false, default: 'zh' },
  ],

  // 模型列表
  models: deepgramModels,

  // 允许自定义模型
  allowCustomModel: true,

  // 默认模型
  defaultModel: {
    asr: 'nova-3',
    tts: undefined, // 不支持 TTS
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
  azure: azureTemplate,
  cartesia: cartesiaTemplate,
  minimax: minimaxTemplate,
  deepgram: deepgramTemplate,
  gemini: geminiTemplate,
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
