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
      serviceType: 'tts', // Cartesia 仅支持 TTS
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
        asr: undefined, // Cartesia 不支持 ASR
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

  return providers;
}

/**
 * 获取系统预置供应商（隐藏完整 API Key）
 * 用于前端显示
 */
export function getSystemProvidersForDisplay(): Omit<GenericProviderConfig, 'apiKey'>[] {
  return getSystemProviders().map(provider => {
    const { apiKey, ...rest } = provider;
    return {
      ...rest,
      apiKey: apiKey ? '***' : undefined, // 隐藏完整 Key
    };
  });
}
