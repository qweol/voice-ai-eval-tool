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
