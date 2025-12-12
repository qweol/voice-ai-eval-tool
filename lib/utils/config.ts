/**
 * 配置管理工具
 * 使用 localStorage 存储用户配置（API密钥、偏好设置等）
 */

import { GenericProviderConfig, ProviderConfig } from '../providers/generic/types';

export interface AppConfig {
  // 通用API配置
  providers: GenericProviderConfig[];
  
  tts: {
    defaultVoice: string;
    defaultSpeed: number;
    defaultVolume: number;
    defaultPitch: number;
  };
  asr: {
    defaultLanguage: string;
    defaultFormat: string;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  providers: [],
  tts: {
    defaultVoice: 'standard',
    defaultSpeed: 1.0,
    defaultVolume: 1.0,
    defaultPitch: 1.0,
  },
  asr: {
    defaultLanguage: 'zh',
    defaultFormat: 'wav',
  },
};

const CONFIG_KEY = 'voice-ai-eval-config';

/**
 * 获取配置
 */
export function getConfig(): AppConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认配置，确保新字段有默认值
      // 兼容旧配置格式（legacyProviders -> providers）
      const providers = parsed.providers || parsed.genericProviders || [];
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        providers,
      };
    }
  } catch (error) {
    console.error('读取配置失败:', error);
  }

  return DEFAULT_CONFIG;
}

/**
 * 保存配置
 */
export function saveConfig(config: AppConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('保存配置失败:', error);
    throw new Error('保存配置失败，可能是存储空间不足');
  }
}

/**
 * 添加API配置
 */
export function addProvider(config: GenericProviderConfig): void {
  const appConfig = getConfig();
  appConfig.providers.push(config);
  saveConfig(appConfig);
}

/**
 * 更新API配置
 */
export function updateProvider(id: string, config: Partial<GenericProviderConfig>): void {
  const appConfig = getConfig();
  const index = appConfig.providers.findIndex(p => p.id === id);
  if (index !== -1) {
    appConfig.providers[index] = {
      ...appConfig.providers[index],
      ...config,
    };
    saveConfig(appConfig);
  }
}

/**
 * 删除API配置
 */
export function removeProvider(id: string): void {
  const appConfig = getConfig();
  appConfig.providers = appConfig.providers.filter(p => p.id !== id);
  saveConfig(appConfig);
}

/**
 * 获取API配置
 */
export function getProvider(id: string): GenericProviderConfig | undefined {
  const appConfig = getConfig();
  return appConfig.providers.find(p => p.id === id);
}

/**
 * 重置配置为默认值
 */
export function resetConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(CONFIG_KEY);
}

/**
 * 获取所有启用的提供者
 */
export function getAllEnabledProviders(): ProviderConfig[] {
  const config = getConfig();
  return config.providers.filter(p => p.enabled);
}
