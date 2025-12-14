/**
 * 模板加载器
 * 支持从多个来源加载模板：内置模板、用户自定义模板、远程模板
 */

import { APITemplate, TemplateType } from './types';
import { templates as builtinTemplates } from './templates';

const USER_TEMPLATES_KEY = 'voice-ai-eval-user-templates';
const TEMPLATE_CACHE_KEY = 'voice-ai-eval-template-cache';

/**
 * 模板注册表
 */
class TemplateRegistry {
  private templates: Map<TemplateType, APITemplate> = new Map();
  private initialized = false;

  /**
   * 初始化模板注册表
   */
  async initialize() {
    if (this.initialized) return;

    // 1. 加载内置模板
    Object.values(builtinTemplates).forEach(template => {
      this.register({
        ...template,
        isBuiltin: true,
      });
    });

    // 2. 加载用户自定义模板
    const userTemplates = this.loadUserTemplates();
    userTemplates.forEach(template => {
      this.register({
        ...template,
        isCustom: true,
      });
    });

    this.initialized = true;
  }

  /**
   * 注册模板
   */
  register(template: APITemplate) {
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板
   */
  get(templateId: TemplateType): APITemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 获取所有模板
   */
  getAll(): APITemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取内置模板
   */
  getBuiltinTemplates(): APITemplate[] {
    return this.getAll().filter(t => t.isBuiltin);
  }

  /**
   * 获取用户自定义模板
   */
  getCustomTemplates(): APITemplate[] {
    return this.getAll().filter(t => t.isCustom);
  }

  /**
   * 检查模板是否存在
   */
  has(templateId: TemplateType): boolean {
    return this.templates.has(templateId);
  }

  /**
   * 删除模板（仅限用户自定义模板）
   */
  remove(templateId: TemplateType): boolean {
    const template = this.get(templateId);
    if (!template || template.isBuiltin) {
      return false; // 不能删除内置模板
    }

    this.templates.delete(templateId);
    this.saveUserTemplates();
    return true;
  }

  /**
   * 从localStorage加载用户自定义模板
   */
  private loadUserTemplates(): APITemplate[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(USER_TEMPLATES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载用户模板失败:', error);
    }

    return [];
  }

  /**
   * 保存用户自定义模板到localStorage
   */
  private saveUserTemplates() {
    if (typeof window === 'undefined') return;

    try {
      const customTemplates = this.getCustomTemplates();
      localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(customTemplates));
    } catch (error) {
      console.error('保存用户模板失败:', error);
      throw new Error('保存模板失败，可能是存储空间不足');
    }
  }

  /**
   * 添加用户自定义模板
   */
  addUserTemplate(template: Omit<APITemplate, 'isCustom'>): APITemplate {
    const newTemplate: APITemplate = {
      ...template,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 检查ID是否已存在
    if (this.has(newTemplate.id) && !this.get(newTemplate.id)?.isCustom) {
      throw new Error(`模板ID "${newTemplate.id}" 已被内置模板使用`);
    }

    this.register(newTemplate);
    this.saveUserTemplates();
    return newTemplate;
  }

  /**
   * 更新用户自定义模板
   */
  updateUserTemplate(templateId: TemplateType, updates: Partial<APITemplate>): APITemplate | null {
    const template = this.get(templateId);
    if (!template || !template.isCustom) {
      return null; // 只能更新用户自定义模板
    }

    const updatedTemplate: APITemplate = {
      ...template,
      ...updates,
      id: templateId, // 确保ID不变
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    this.register(updatedTemplate);
    this.saveUserTemplates();
    return updatedTemplate;
  }

  /**
   * 从URL加载远程模板
   */
  async loadFromUrl(url: string): Promise<APITemplate[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`加载模板失败: ${response.statusText}`);
      }

      const data = await response.json();
      const templates: APITemplate[] = Array.isArray(data) ? data : data.templates || [];

      // 验证模板格式
      templates.forEach(template => {
        if (!template.id || !template.name) {
          throw new Error('模板格式无效：缺少id或name');
        }
      });

      return templates;
    } catch (error: any) {
      console.error('从URL加载模板失败:', error);
      throw new Error(`加载远程模板失败: ${error.message}`);
    }
  }

  /**
   * 导入模板（从JSON字符串或对象）
   */
  importTemplates(data: string | APITemplate[]): APITemplate[] {
    let templates: APITemplate[];

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        templates = Array.isArray(parsed) ? parsed : parsed.templates || [];
      } catch (error) {
        throw new Error('无效的JSON格式');
      }
    } else {
      templates = Array.isArray(data) ? data : [];
    }

    // 验证并导入模板
    const imported: APITemplate[] = [];
    templates.forEach(template => {
      if (!template.id || !template.name) {
        console.warn('跳过无效模板:', template);
        return;
      }

      // 如果模板已存在且是内置模板，跳过
      if (this.has(template.id) && this.get(template.id)?.isBuiltin) {
        console.warn(`跳过内置模板: ${template.id}`);
        return;
      }

      // 添加或更新模板
      if (this.has(template.id)) {
        this.updateUserTemplate(template.id, template);
      } else {
        this.addUserTemplate(template);
      }

      imported.push(template);
    });

    return imported;
  }

  /**
   * 导出模板（用户自定义模板）
   */
  exportTemplates(): string {
    const customTemplates = this.getCustomTemplates();
    return JSON.stringify(customTemplates, null, 2);
  }

  /**
   * 导出所有模板（包括内置模板）
   */
  exportAllTemplates(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }
}

// 单例实例
const templateRegistry = new TemplateRegistry();

// 初始化（在客户端）
if (typeof window !== 'undefined') {
  templateRegistry.initialize();
}

/**
 * 获取模板（异步，确保已初始化）
 */
export async function getTemplate(templateId: TemplateType): Promise<APITemplate | undefined> {
  await templateRegistry.initialize();
  return templateRegistry.get(templateId);
}

/**
 * 获取所有模板
 */
export async function getAllTemplates(): Promise<APITemplate[]> {
  await templateRegistry.initialize();
  return templateRegistry.getAll();
}

/**
 * 获取内置模板
 */
export async function getBuiltinTemplates(): Promise<APITemplate[]> {
  await templateRegistry.initialize();
  return templateRegistry.getBuiltinTemplates();
}

/**
 * 获取用户自定义模板
 */
export async function getCustomTemplates(): Promise<APITemplate[]> {
  await templateRegistry.initialize();
  return templateRegistry.getCustomTemplates();
}

/**
 * 添加用户自定义模板
 */
export async function addUserTemplate(template: Omit<APITemplate, 'isCustom'>): Promise<APITemplate> {
  await templateRegistry.initialize();
  return templateRegistry.addUserTemplate(template);
}

/**
 * 更新用户自定义模板
 */
export async function updateUserTemplate(
  templateId: TemplateType,
  updates: Partial<APITemplate>
): Promise<APITemplate | null> {
  await templateRegistry.initialize();
  return templateRegistry.updateUserTemplate(templateId, updates);
}

/**
 * 删除用户自定义模板
 */
export async function removeUserTemplate(templateId: TemplateType): Promise<boolean> {
  await templateRegistry.initialize();
  return templateRegistry.remove(templateId);
}

/**
 * 从URL加载远程模板
 */
export async function loadTemplatesFromUrl(url: string): Promise<APITemplate[]> {
  await templateRegistry.initialize();
  return templateRegistry.loadFromUrl(url);
}

/**
 * 导入模板
 */
export async function importTemplates(data: string | APITemplate[]): Promise<APITemplate[]> {
  await templateRegistry.initialize();
  return templateRegistry.importTemplates(data);
}

/**
 * 导出模板
 */
export async function exportTemplates(): Promise<string> {
  await templateRegistry.initialize();
  return templateRegistry.exportTemplates();
}

/**
 * 导出所有模板
 */
export async function exportAllTemplates(): Promise<string> {
  await templateRegistry.initialize();
  return templateRegistry.exportAllTemplates();
}

/**
 * 检查模板是否存在
 */
export async function hasTemplate(templateId: TemplateType): Promise<boolean> {
  await templateRegistry.initialize();
  return templateRegistry.has(templateId);
}

// 导出注册表实例（用于高级用法）
export { templateRegistry };

