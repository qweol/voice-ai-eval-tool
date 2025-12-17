/**
 * 配置管理工具
 * 使用 localStorage 存储用户配置（API密钥、偏好设置等）
 */

import { GenericProviderConfig, ProviderConfig } from '../providers/generic/types';
import { BadCase, BadCaseStats, BadCaseStatus, BadCaseSeverity, BadCaseCategory } from '../types';

export interface AppConfig {
  // 通用API配置
  providers: GenericProviderConfig[];

  // 系统预置供应商的覆盖配置（用于保存用户对系统预置供应商的修改）
  systemProviderOverrides?: Record<string, Partial<GenericProviderConfig>>;

  // BadCase 管理
  badCases: BadCase[];

  tts: {
    defaultSpeed: number;
  };
  asr: {
    defaultLanguage: string;
    defaultFormat: string;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  providers: [],
  systemProviderOverrides: {},
  badCases: [],
  tts: {
    defaultSpeed: 1.0,
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
      const badCases = parsed.badCases || [];
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        providers,
        badCases,
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
 * 支持更新用户自定义供应商和系统预置供应商
 */
export function updateProvider(id: string, config: Partial<GenericProviderConfig>): void {
  const appConfig = getConfig();

  // 1. 先尝试更新用户自定义供应商
  const index = appConfig.providers.findIndex(p => p.id === id);
  if (index !== -1) {
    appConfig.providers[index] = {
      ...appConfig.providers[index],
      ...config,
    };
    saveConfig(appConfig);
    return;
  }

  // 2. 如果不是用户自定义供应商，则保存为系统预置供应商的覆盖配置
  if (id.startsWith('system-')) {
    if (!appConfig.systemProviderOverrides) {
      appConfig.systemProviderOverrides = {};
    }

    // 合并现有的覆盖配置
    appConfig.systemProviderOverrides[id] = {
      ...appConfig.systemProviderOverrides[id],
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

/**
 * 获取所有供应商（系统预置 + 用户自定义）
 * 用于前端显示
 */
export async function getAllProvidersWithSystem(): Promise<GenericProviderConfig[]> {
  try {
    // 1. 获取系统预置供应商
    const systemResponse = await fetch('/api/providers/system');
    const systemData = await systemResponse.json();
    let systemProviders = systemData.success ? systemData.data : [];

    // 2. 获取用户配置（包括覆盖配置）
    const appConfig = getConfig();
    const userProviders = appConfig.providers;
    const overrides = appConfig.systemProviderOverrides || {};

    // 3. 应用覆盖配置到系统预置供应商
    systemProviders = systemProviders.map((provider: GenericProviderConfig) => {
      const override = overrides[provider.id];
      if (override) {
        return {
          ...provider,
          ...override,
        };
      }
      return provider;
    });

    // 4. 合并（系统预置在前）
    return [...systemProviders, ...userProviders];
  } catch (error) {
    console.error('获取系统预置供应商失败，仅返回用户自定义供应商:', error);
    // 如果获取系统预置失败，只返回用户自定义供应商
    return getConfig().providers;
  }
}

/**
 * 获取所有启用的供应商（包括系统预置）
 */
export async function getAllEnabledProvidersWithSystem(): Promise<GenericProviderConfig[]> {
  const allProviders = await getAllProvidersWithSystem();
  return allProviders.filter(p => p.enabled);
}

// ============================================
// BadCase 管理函数
// ============================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 获取所有 BadCase
 */
export function getAllBadCases(): BadCase[] {
  const config = getConfig();
  return config.badCases || [];
}

/**
 * 获取单个 BadCase
 */
export function getBadCase(id: string): BadCase | undefined {
  const config = getConfig();
  return config.badCases?.find(bc => bc.id === id);
}

/**
 * 创建 BadCase
 */
export function createBadCase(input: Omit<BadCase, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): BadCase {
  const config = getConfig();

  const newBadCase: BadCase = {
    ...input,
    id: generateId(),
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  config.badCases = [...(config.badCases || []), newBadCase];
  saveConfig(config);

  return newBadCase;
}

/**
 * 更新 BadCase
 */
export function updateBadCase(id: string, updates: Partial<BadCase>): BadCase | null {
  const config = getConfig();
  const index = config.badCases?.findIndex(bc => bc.id === id) ?? -1;

  if (index === -1) {
    return null;
  }

  const updatedBadCase: BadCase = {
    ...config.badCases[index],
    ...updates,
    id, // 确保 ID 不被修改
    updatedAt: new Date().toISOString(),
  };

  config.badCases[index] = updatedBadCase;
  saveConfig(config);

  return updatedBadCase;
}

/**
 * 删除 BadCase
 */
export function deleteBadCase(id: string): boolean {
  const config = getConfig();
  const initialLength = config.badCases?.length || 0;

  config.badCases = config.badCases?.filter(bc => bc.id !== id) || [];

  if (config.badCases.length < initialLength) {
    saveConfig(config);
    return true;
  }

  return false;
}

/**
 * 批量删除 BadCase
 */
export function deleteBadCases(ids: string[]): number {
  const config = getConfig();
  const initialLength = config.badCases?.length || 0;

  config.badCases = config.badCases?.filter(bc => !ids.includes(bc.id)) || [];

  const deletedCount = initialLength - config.badCases.length;
  if (deletedCount > 0) {
    saveConfig(config);
  }

  return deletedCount;
}

/**
 * 查询 BadCase（支持筛选、搜索、排序）
 */
export function queryBadCases(options: {
  status?: BadCaseStatus;
  category?: keyof typeof BadCaseCategory;
  severity?: BadCaseSeverity;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
} = {}): BadCase[] {
  let badCases = getAllBadCases();

  // 筛选：状态
  if (options.status) {
    badCases = badCases.filter(bc => bc.status === options.status);
  }

  // 筛选：分类
  if (options.category) {
    badCases = badCases.filter(bc => bc.category === options.category);
  }

  // 筛选：严重程度
  if (options.severity) {
    badCases = badCases.filter(bc => bc.severity === options.severity);
  }

  // 筛选：标签（包含任意一个标签即可）
  if (options.tags && options.tags.length > 0) {
    badCases = badCases.filter(bc =>
      bc.tags.some(tag => options.tags!.includes(tag))
    );
  }

  // 搜索：文本内容
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    badCases = badCases.filter(bc =>
      bc.text.toLowerCase().includes(searchLower) ||
      bc.description?.toLowerCase().includes(searchLower) ||
      bc.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // 排序
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  badCases.sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];

    // 日期字符串转换为时间戳
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return badCases;
}

/**
 * 获取 BadCase 统计数据
 */
export function getBadCaseStats(): BadCaseStats {
  const badCases = getAllBadCases();

  const stats: BadCaseStats = {
    total: badCases.length,
    byStatus: {
      [BadCaseStatus.OPEN]: 0,
      [BadCaseStatus.CONFIRMED]: 0,
      [BadCaseStatus.FIXED]: 0,
      [BadCaseStatus.WONTFIX]: 0,
    },
    byCategory: {},
    bySeverity: {
      [BadCaseSeverity.CRITICAL]: 0,
      [BadCaseSeverity.MAJOR]: 0,
      [BadCaseSeverity.MINOR]: 0,
    },
    byProvider: {},
  };

  badCases.forEach(bc => {
    // 按状态统计
    stats.byStatus[bc.status]++;

    // 按分类统计
    const categoryName = BadCaseCategory[bc.category];
    stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;

    // 按严重程度统计
    stats.bySeverity[bc.severity]++;

    // 按供应商统计
    Object.keys(bc.audioUrls).forEach(providerId => {
      stats.byProvider[providerId] = (stats.byProvider[providerId] || 0) + 1;
    });
  });

  return stats;
}

/**
 * 批量更新 BadCase 状态
 */
export function batchUpdateBadCaseStatus(ids: string[], status: BadCaseStatus): number {
  const config = getConfig();
  let updatedCount = 0;

  config.badCases = config.badCases?.map(bc => {
    if (ids.includes(bc.id)) {
      updatedCount++;
      return {
        ...bc,
        status,
        updatedAt: new Date().toISOString(),
      };
    }
    return bc;
  }) || [];

  if (updatedCount > 0) {
    saveConfig(config);
  }

  return updatedCount;
}

/**
 * 批量添加标签
 */
export function batchAddTags(ids: string[], tags: string[]): number {
  const config = getConfig();
  let updatedCount = 0;

  config.badCases = config.badCases?.map(bc => {
    if (ids.includes(bc.id)) {
      updatedCount++;
      const newTags = [...new Set([...bc.tags, ...tags])]; // 去重
      return {
        ...bc,
        tags: newTags,
        updatedAt: new Date().toISOString(),
      };
    }
    return bc;
  }) || [];

  if (updatedCount > 0) {
    saveConfig(config);
  }

  return updatedCount;
}
