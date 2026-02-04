/**
 * 系统预置供应商配置
 * 用于为内部测试人员提供开箱即用的供应商配置
 */

import { GenericProviderConfig } from './generic/types';
import { templates } from './generic/templates';

/**
 * 获取系统预置供应商列表
 * 从环境变量中读取 API Key
 */
export function getSystemProviders(): GenericProviderConfig[] {
  const providers: GenericProviderConfig[] = [];

  // Qwen/通义千问 预置配置
  if (process.env.QWEN_API_KEY) {
    const qwenTemplate = templates.qwen;

    providers.push({
      id: 'system-qwen',
      name: '通义千问（系统预置）',
      type: 'generic',
      serviceType: 'both',
      apiUrl: qwenTemplate.defaultApiUrl,
      method: qwenTemplate.defaultMethod,
      authType: qwenTemplate.authType,
      apiKey: process.env.QWEN_API_KEY,
      requestBody: qwenTemplate.requestBodyTemplate.tts, // 默认使用 TTS 模板
      responseTextPath: qwenTemplate.responseTextPath,
      responseAudioPath: qwenTemplate.responseAudioPath,
      responseAudioFormat: qwenTemplate.responseAudioFormat,
      errorPath: qwenTemplate.errorPath,
      templateType: 'qwen',
      selectedModels: {
        asr: qwenTemplate.defaultModel?.asr,
        tts: qwenTemplate.defaultModel?.tts,
      },
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Cartesia 预置配置
  if (process.env.CARTESIA_API_KEY) {
    const cartesiaTemplate = templates.cartesia;

    providers.push({
      id: 'system-cartesia',
      name: 'Cartesia（系统预置）',
      type: 'generic',
      serviceType: 'both',
      apiUrl: cartesiaTemplate.defaultApiUrl,
      method: cartesiaTemplate.defaultMethod,
      authType: cartesiaTemplate.authType,
      apiKey: process.env.CARTESIA_API_KEY,
      requestBody: cartesiaTemplate.requestBodyTemplate.tts, // 使用 TTS 模板
      responseTextPath: cartesiaTemplate.responseTextPath,
      responseAudioPath: cartesiaTemplate.responseAudioPath,
      responseAudioFormat: cartesiaTemplate.responseAudioFormat,
      errorPath: cartesiaTemplate.errorPath,
      templateType: 'cartesia',
      selectedModels: {
        asr: cartesiaTemplate.defaultModel?.asr,
        tts: cartesiaTemplate.defaultModel?.tts,
      },
      selectedVoice: '694f9389-aac1-45b6-b726-9d9369183238', // 默认使用 British Lady
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // OpenAI 预置配置
  if (process.env.OPENAI_API_KEY) {
    const openaiTemplate = templates.openai;

    // 使用 OPENAI_TTS_API_URL 环境变量指定的 URL
    // 如果没有设置，使用默认的官方 URL
    const ttsApiUrl = process.env.OPENAI_TTS_API_URL || 'https://api.openai.com/v1/audio/speech';

    providers.push({
      id: 'system-openai',
      name: 'OpenAI（系统预置）',
      type: 'generic',
      serviceType: 'both',
      apiUrl: ttsApiUrl,
      method: openaiTemplate.defaultMethod,
      authType: openaiTemplate.authType,
      apiKey: process.env.OPENAI_API_KEY,
      requestBody: openaiTemplate.requestBodyTemplate.tts, // 默认使用 TTS 模板
      responseTextPath: openaiTemplate.responseTextPath,
      responseAudioPath: openaiTemplate.responseAudioPath,
      responseAudioFormat: openaiTemplate.responseAudioFormat,
      errorPath: openaiTemplate.errorPath,
      templateType: 'openai',
      selectedModels: {
        asr: openaiTemplate.defaultModel?.asr,
        tts: openaiTemplate.defaultModel?.tts,
      },
      selectedVoice: 'alloy', // 默认使用 alloy 音色
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Doubao/豆包 预置配置（ASR）
  // 需要三个参数：DOUBAO_APP_ID, DOUBAO_ACCESS_TOKEN, DOUBAO_RESOURCE_ID
  if (process.env.DOUBAO_APP_ID && process.env.DOUBAO_ACCESS_TOKEN) {
    const doubaoTemplate = templates.doubao;

    // 允许通过环境变量自定义API端点和Resource ID
    const apiUrl = process.env.DOUBAO_API_URL || doubaoTemplate.defaultApiUrl;
    const resourceId = process.env.DOUBAO_RESOURCE_ID || 'volc.bigasr.auc_turbo';

    // ASR 配置
    providers.push({
      id: 'system-doubao-asr',
      name: '豆包 ASR（系统预置）',
      type: 'generic',
      serviceType: 'asr',
      apiUrl: apiUrl,
      method: doubaoTemplate.defaultMethod,
      authType: doubaoTemplate.authType, // 'custom'
      apiKey: process.env.DOUBAO_ACCESS_TOKEN, // Access Token
      appId: process.env.DOUBAO_APP_ID, // App ID
      requestBody: doubaoTemplate.requestBodyTemplate.asr, // 使用 ASR 模板
      responseTextPath: doubaoTemplate.responseTextPath,
      responseAudioPath: doubaoTemplate.responseAudioPath,
      responseAudioFormat: doubaoTemplate.responseAudioFormat,
      errorPath: doubaoTemplate.errorPath,
      templateType: 'doubao',
      selectedModels: {
        asr: 'bigmodel-flash', // 默认使用极速版
        tts: undefined,
      },
      // 存储自定义的 Resource ID，供 caller.ts 使用
      requestHeaders: {
        'X-Api-Resource-Id': resourceId,
      },
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });

    // TTS 配置
    const ttsApiUrl = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
    const ttsResourceId = process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0';

    providers.push({
      id: 'system-doubao-tts',
      name: '豆包 TTS（系统预置）',
      type: 'generic',
      serviceType: 'tts',
      apiUrl: ttsApiUrl,
      method: doubaoTemplate.defaultMethod,
      authType: doubaoTemplate.authType, // 'custom'
      apiKey: process.env.DOUBAO_ACCESS_TOKEN, // Access Token
      appId: process.env.DOUBAO_APP_ID, // App ID
      requestBody: doubaoTemplate.requestBodyTemplate.tts, // 使用 TTS 模板
      responseTextPath: undefined,
      responseAudioPath: doubaoTemplate.responseAudioPath, // 'data'
      responseAudioFormat: doubaoTemplate.responseAudioFormat, // 'base64'
      errorPath: doubaoTemplate.errorPath,
      templateType: 'doubao',
      selectedModels: {
        asr: undefined,
        tts: 'doubao-tts-2.0',
      },
      selectedVoice: 'BV700_V2_streaming', // 默认使用灿灿2.0音色
      // 存储 TTS Resource ID，供 caller.ts 使用
      requestHeaders: {
        'X-Api-Resource-Id': ttsResourceId,
      },
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Minimax 预置配置
  // 支持两种方式：
  // 1. HTTP REST API（通过代理/中转站）：使用 MINIMAX_TTS_API_URL
  // 2. WebSocket（官方）：使用 MINIMAX_APP_ID + MINIMAX_TOKEN

  // 方式1：HTTP REST API（代理方式）
  if (process.env.MINIMAX_TTS_API_URL && process.env.MINIMAX_API_KEY) {
    const modelId = process.env.MINIMAX_TTS_MODEL || 'speech-02-turbo';
    const groupId = process.env.MINIMAX_GROUP_ID;

    // 构建 HTTP 请求体模板
    // 根据官方文档：https://platform.minimaxi.com/docs/api-reference/speech-t2a-http
    // 使用 voice_setting 对象结构，而不是扁平结构
    const httpRequestBody = JSON.stringify({
      model: '{model}',
      text: '{text}',
      stream: false, // 非流式输出
      voice_setting: {
        voice_id: '{voice}',
        speed: '{speed}', // 官方使用 speed，不是 speed_ratio
        vol: 1, // 音量，默认 1
        pitch: 0, // 音调，默认 0
      },
      language: '{language}', // 语言参数，用于转换为 language_boost
      // 注意：官方 API 没有 group_id 字段，如果代理 API 需要，可能需要通过其他方式传递
      // 或者代理 API 的格式与官方不同
      ...(groupId && { group_id: groupId.includes('"') ? groupId.replace(/"/g, '') : groupId }),
    }, null, 2);

    providers.push({
      id: 'system-minimax-http',
      name: 'Minimax（系统预置）',
      type: 'generic',
      serviceType: 'tts',
      apiUrl: process.env.MINIMAX_TTS_API_URL,
      method: 'POST',
      authType: 'bearer', // 或 'apikey'，需要根据实际 API 调整
      apiKey: process.env.MINIMAX_API_KEY,
      protocol: 'http', // 使用 HTTP 协议
      requestBody: httpRequestBody,
      responseTextPath: undefined,
      responseAudioPath: 'data.audio', // 官方文档：音频数据在 data.audio 中，是 hex 编码
      responseAudioFormat: 'hex', // 官方使用 hex 编码，不是 base64
      errorPath: 'base_resp.status_msg', // Minimax HTTP API 错误信息路径
      templateType: 'minimax',
      selectedModels: {
        asr: undefined,
        tts: modelId, // 使用环境变量中的模型，默认 speech-02-turbo
      },
      // 确保使用自定义模型，而不是模板默认值
      customModels: {
        tts: modelId,
      },
      selectedVoice: 'male-qn-qingse', // 使用官方文档示例中的音色 ID（speech-02-turbo 支持）
      enabled: true,
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // 方式2：WebSocket（官方方式）
  if (process.env.MINIMAX_APP_ID && process.env.MINIMAX_TOKEN) {
    const minimaxTemplate = templates.minimax;

    providers.push({
      id: 'system-minimax',
      name: 'Minimax WebSocket（系统预置）',
      type: 'generic',
      serviceType: 'tts', // Minimax 仅支持 TTS
      apiUrl: minimaxTemplate.defaultApiUrl,
      method: minimaxTemplate.defaultMethod,
      authType: minimaxTemplate.authType,
      apiKey: process.env.MINIMAX_TOKEN, // Token
      appId: process.env.MINIMAX_APP_ID, // AppID
      protocol: 'websocket', // 使用 WebSocket 协议
      requestBody: minimaxTemplate.requestBodyTemplate.tts, // 使用 TTS 模板
      responseTextPath: minimaxTemplate.responseTextPath,
      responseAudioPath: minimaxTemplate.responseAudioPath,
      responseAudioFormat: minimaxTemplate.responseAudioFormat,
      errorPath: minimaxTemplate.errorPath,
      templateType: 'minimax',
      selectedModels: {
        asr: undefined, // Minimax 不支持 ASR
        tts: minimaxTemplate.defaultModel?.tts,
      },
      selectedVoice: 'male-qn-qingse', // 默认使用已验证可用的音色（官方文档示例）
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Azure Speech 预置配置（ASR）
  // 需要两个参数：AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    const azureTemplate = templates.azure;
    const region = process.env.AZURE_SPEECH_REGION;

    // ASR 配置
    const asrApiUrl = azureTemplate.defaultApiUrl.replace('{region}', region);

    providers.push({
      id: 'system-azure-asr',
      name: 'Azure Speech ASR（系统预置）',
      type: 'generic',
      serviceType: 'asr',
      apiUrl: asrApiUrl,
      method: azureTemplate.defaultMethod,
      authType: azureTemplate.authType,
      apiKey: process.env.AZURE_SPEECH_KEY,
      requestBody: azureTemplate.requestBodyTemplate.asr,
      responseTextPath: azureTemplate.responseTextPath,
      responseAudioPath: azureTemplate.responseAudioPath,
      responseAudioFormat: azureTemplate.responseAudioFormat,
      errorPath: azureTemplate.errorPath,
      templateType: 'azure',
      selectedModels: {
        asr: azureTemplate.defaultModel?.asr,
        tts: undefined,
      },
      requestHeaders: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      enabled: true,
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });

    // TTS 配置
    const ttsApiUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    providers.push({
      id: 'system-azure-tts',
      name: 'Azure Speech TTS（系统预置）',
      type: 'generic',
      serviceType: 'tts',
      apiUrl: ttsApiUrl,
      method: azureTemplate.defaultMethod,
      authType: azureTemplate.authType,
      apiKey: process.env.AZURE_SPEECH_KEY,
      requestBody: azureTemplate.requestBodyTemplate.tts,
      responseTextPath: undefined,
      responseAudioPath: azureTemplate.responseAudioPath,
      responseAudioFormat: azureTemplate.responseAudioFormat,
      errorPath: azureTemplate.errorPath,
      templateType: 'azure',
      selectedModels: {
        asr: undefined,
        tts: azureTemplate.defaultModel?.tts,
      },
      selectedVoice: 'zh-CN-XiaoxiaoNeural', // 默认使用晓晓音色
      requestHeaders: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
      },
      enabled: true,
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Deepgram 预置配置
  if (process.env.DEEPGRAM_API_KEY) {
    const deepgramTemplate = templates.deepgram;

    providers.push({
      id: 'system-deepgram',
      name: 'Deepgram（系统预置）',
      type: 'generic',
      serviceType: 'asr', // Deepgram 仅支持 ASR
      apiUrl: deepgramTemplate.defaultApiUrl,
      method: deepgramTemplate.defaultMethod,
      authType: deepgramTemplate.authType,
      apiKey: process.env.DEEPGRAM_API_KEY,
      requestBody: deepgramTemplate.requestBodyTemplate.asr, // 使用 ASR 模板
      responseTextPath: deepgramTemplate.responseTextPath,
      responseAudioPath: deepgramTemplate.responseAudioPath,
      responseAudioFormat: deepgramTemplate.responseAudioFormat,
      errorPath: deepgramTemplate.errorPath,
      templateType: 'deepgram',
      selectedModels: {
        asr: deepgramTemplate.defaultModel?.asr,
        tts: undefined, // Deepgram 不支持 TTS
      },
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // Gemini (Vertex AI) 预置配置
  if (process.env.VERTEX_AI_PROJECT_ID && process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON) {
    const geminiTemplate = templates.gemini;
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    const location = process.env.VERTEX_AI_LOCATION || 'global';

    // 构建 Vertex AI API URL
    const apiUrl = geminiTemplate.defaultApiUrl
      .replace('{projectId}', projectId)
      .replace('{location}', location)
      .replace('{model}', 'gemini-2.5-flash'); // 默认模型

    providers.push({
      id: 'system-gemini',
      name: 'Gemini（系统预置）',
      type: 'generic',
      serviceType: 'asr', // Gemini 仅支持 ASR
      apiUrl: apiUrl,
      method: geminiTemplate.defaultMethod,
      authType: geminiTemplate.authType,
      apiKey: process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON, // 存储服务账号 JSON
      requestBody: geminiTemplate.requestBodyTemplate.asr,
      responseTextPath: geminiTemplate.responseTextPath,
      responseAudioPath: geminiTemplate.responseAudioPath,
      responseAudioFormat: geminiTemplate.responseAudioFormat,
      errorPath: geminiTemplate.errorPath,
      templateType: 'gemini',
      selectedModels: {
        asr: geminiTemplate.defaultModel?.asr,
        tts: undefined,
      },
      // 存储 Vertex AI 配置
      requestHeaders: {
        'X-Vertex-AI-Project-ID': projectId,
        'X-Vertex-AI-Location': location,
      },
      enabled: true,
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  // ElevenLabs 预置配置
  if (process.env.ELEVENLABS_API_KEY) {
    const elevenlabsTemplate = templates.elevenlabs;

    providers.push({
      id: 'system-elevenlabs',
      name: 'ElevenLabs（系统预置）',
      type: 'generic',
      serviceType: 'tts',
      apiUrl: elevenlabsTemplate.defaultApiUrl,
      method: elevenlabsTemplate.defaultMethod,
      authType: elevenlabsTemplate.authType,
      apiKey: process.env.ELEVENLABS_API_KEY,
      requestBody: elevenlabsTemplate.requestBodyTemplate.tts,
      responseTextPath: elevenlabsTemplate.responseTextPath,
      responseAudioPath: elevenlabsTemplate.responseAudioPath,
      responseAudioFormat: elevenlabsTemplate.responseAudioFormat,
      errorPath: elevenlabsTemplate.errorPath,
      templateType: 'elevenlabs',
      selectedModels: {
        asr: elevenlabsTemplate.defaultModel?.asr,
        tts: elevenlabsTemplate.defaultModel?.tts,
      },
      selectedVoice: '21m00Tcm4TlvDq8ikWAM', // 默认使用 Rachel 音色
      enabled: true,
      // 系统预置标识
      isSystem: true,
      readonly: true,
    } as GenericProviderConfig & { isSystem: boolean; readonly: boolean });
  }

  return providers;
}

/**
 * 获取系统预置供应商（隐藏完整 API Key 和 AppID）
 * 用于前端显示
 */
export function getSystemProvidersForDisplay(): Omit<GenericProviderConfig, 'apiKey' | 'appId'>[] {
  return getSystemProviders().map(provider => {
    const { apiKey, appId, ...rest } = provider;
    return {
      ...rest,
      apiKey: apiKey ? '***' : undefined, // 隐藏完整 Key
      appId: appId ? '***' : undefined, // 隐藏完整 AppID
    };
  });
}
