'use client';

import { useState, useEffect } from 'react';
import { GenericProviderConfig, TemplateType, APITemplate, ModelDefinition } from '@/lib/providers/generic/types';
import { templates } from '@/lib/providers/generic/templates';
import { getAllTemplates } from '@/lib/providers/generic/template-loader';
import { addProvider, updateProvider, removeProvider, getConfig } from '@/lib/utils/config';
import ProviderCard from './ProviderCard';

interface CherryStyleProviderManagerProps {
  providers: GenericProviderConfig[];
  onUpdate: () => void;
}

export default function CherryStyleProviderManager({
  providers,
  onUpdate,
}: CherryStyleProviderManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<APITemplate[]>(Object.values(templates));
  const [formData, setFormData] = useState<Partial<GenericProviderConfig>>({
    name: '',
    serviceType: 'both',
    templateType: 'openai',
    apiUrl: '',
    method: 'POST',
    authType: 'bearer',
    apiKey: '',
    appId: '', // Minimax 专用字段
    enabled: true,
    selectedModels: {},
  });

  const [availableModels, setAvailableModels] = useState<{
    asr: ModelDefinition[];
    tts: ModelDefinition[];
  }>({ asr: [], tts: [] });

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const allTemplates = await getAllTemplates();
        setAvailableTemplates(allTemplates);
      } catch (error) {
        console.error('加载模板失败:', error);
        setAvailableTemplates(Object.values(templates));
      }
    };
    loadTemplates();
  }, []);

  // 当模板类型改变时，加载可用模型
  useEffect(() => {
    if (formData.templateType) {
      const dynamicTemplate = availableTemplates.find(t => t.id === formData.templateType);
      const template = dynamicTemplate || templates[formData.templateType as keyof typeof templates];
      
      if (template?.models) {
        setAvailableModels({
          asr: template.models.filter(m => m.type === 'asr'),
          tts: template.models.filter(m => m.type === 'tts'),
        });

        // 自动设置默认模型
        if (!formData.selectedModels?.asr && template.defaultModel?.asr) {
          setFormData(prev => ({
            ...prev,
            selectedModels: {
              ...prev.selectedModels,
              asr: template.defaultModel?.asr,
            },
          }));
        }
        if (!formData.selectedModels?.tts && template.defaultModel?.tts) {
          setFormData(prev => ({
            ...prev,
            selectedModels: {
              ...prev.selectedModels,
              tts: template.defaultModel?.tts,
            },
          }));
        }
      }
    }
  }, [formData.templateType, availableTemplates]);

  const handleTemplateChange = (templateType: TemplateType) => {
    const dynamicTemplate = availableTemplates.find(t => t.id === templateType);
    const template = dynamicTemplate || templates[templateType as keyof typeof templates];
    
    if (!template) return;

    // 根据服务类型选择正确的请求体模板
    let requestBody = '';
    if (formData.serviceType === 'asr') {
      requestBody = template.requestBodyTemplate.asr || '';
    } else if (formData.serviceType === 'tts') {
      requestBody = template.requestBodyTemplate.tts || '';
    } else {
      // both: 优先使用TTS模板（因为通常TTS更常用）
      requestBody = template.requestBodyTemplate.tts || template.requestBodyTemplate.asr || '';
    }

    setFormData({
      ...formData,
      templateType,
      apiUrl: template.defaultApiUrl,
      method: template.defaultMethod,
      authType: template.authType,
      requestBody: requestBody, // 确保保存请求体模板
      responseTextPath: template.responseTextPath,
      responseAudioPath: template.responseAudioPath,
      responseAudioFormat: template.responseAudioFormat,
      errorPath: template.errorPath,
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.apiUrl) {
      alert('请填写名称和API地址');
      return;
    }

    const newProvider: GenericProviderConfig = {
      id: editingId || `provider-${Date.now()}`,
      name: formData.name,
      type: 'generic',
      serviceType: formData.serviceType || 'both',
      apiUrl: formData.apiUrl,
      method: formData.method || 'POST',
      authType: formData.authType || 'bearer',
      apiKey: formData.apiKey || '',
      // Minimax 专用字段
      appId: formData.appId || undefined,
      protocol: formData.templateType === 'minimax' ? 'websocket' : undefined,
      requestBody: formData.requestBody,
      requestHeaders: formData.requestHeaders,
      responseTextPath: formData.responseTextPath,
      responseAudioPath: formData.responseAudioPath,
      responseAudioFormat: formData.responseAudioFormat,
      errorPath: formData.errorPath,
      templateType: formData.templateType,
      selectedModels: formData.selectedModels,
      enabled: formData.enabled !== false,
    };

    if (editingId) {
      updateProvider(editingId, newProvider);
    } else {
      addProvider(newProvider);
    }

    // 重置表单
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      serviceType: 'both',
      templateType: 'openai',
      apiUrl: '',
      method: 'POST',
      authType: 'bearer',
      apiKey: '',
      appId: '',
      enabled: true,
      selectedModels: {},
    });
    onUpdate();
  };

  const handleEdit = (provider: GenericProviderConfig) => {
    setEditingId(provider.id);
    setFormData(provider);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    removeProvider(id);
    onUpdate();
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    updateProvider(id, { enabled });
    onUpdate();
  };

  const handleUpdateModel = (id: string, serviceType: 'asr' | 'tts', modelId: string) => {
    const provider = providers.find(p => p.id === id);
    if (!provider) return;

    updateProvider(id, {
      selectedModels: {
        ...provider.selectedModels,
        [serviceType]: modelId,
      },
    });
    onUpdate();
  };

  const handleUpdateVoice = (id: string, voiceId: string) => {
    updateProvider(id, { selectedVoice: voiceId });
    onUpdate();
  };

  const handleFetchModels = async (providerId: string) => {
    // 这里可以实现从API获取模型列表的功能
    // 目前从模板中获取
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    const templates = await getAllTemplates();
    const template = templates.find(t => t.id === provider.templateType);
    if (template?.models) {
      // 模型列表已经在模板中定义
      console.log('可用模型:', template.models);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">模型服务</h2>
          <p className="text-sm text-gray-600 mt-1">
            添加和管理语音服务供应商，支持ASR和TTS功能
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({
              name: '',
              serviceType: 'both',
              templateType: 'openai',
              apiUrl: '',
              method: 'POST',
              authType: 'bearer',
              apiKey: '',
              appId: '',
              enabled: true,
              selectedModels: {},
            });
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>添加供应商</span>
        </button>
      </div>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="mb-6 p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editingId ? '编辑供应商' : '添加新供应商'}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 基本信息 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                供应商名称 *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：OpenAI、Kimi、豆包"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板类型 *
              </label>
              <select
                value={formData.templateType || 'openai'}
                onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.isBuiltin ? '(内置)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API地址 *
              </label>
              <input
                type="text"
                value={formData.apiUrl || ''}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API密钥 *
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={formData.templateType === 'minimax' ? 'Token (访问密钥)' : 'sk-...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Minimax 专用：AppID 输入框 */}
            {formData.templateType === 'minimax' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AppID * (Minimax 专用)
                </label>
                <input
                  type="text"
                  value={formData.appId || ''}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  placeholder="app_xxxxxxxxxxxxxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  从 Minimax 控制台获取 AppID
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服务类型
              </label>
              <select
                value={formData.serviceType || 'both'}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asr">仅ASR（语音识别）</option>
                <option value="tts">仅TTS（语音合成）</option>
                <option value="both">ASR和TTS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                认证方式
              </label>
              <select
                value={formData.authType || 'bearer'}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>

          {/* 模型选择 */}
          {(availableModels.asr.length > 0 || availableModels.tts.length > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">选择模型</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {availableModels.asr.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ASR模型
                    </label>
                    <select
                      value={formData.selectedModels?.asr || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        selectedModels: {
                          ...formData.selectedModels,
                          asr: e.target.value,
                        },
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">选择ASR模型</option>
                      {availableModels.asr.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableModels.tts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TTS模型
                    </label>
                    <select
                      value={formData.selectedModels?.tts || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        selectedModels: {
                          ...formData.selectedModels,
                          tts: e.target.value,
                        },
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">选择TTS模型</option>
                      {availableModels.tts.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {editingId ? '保存更改' : '添加供应商'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 供应商列表 */}
      {providers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">还没有添加供应商</p>
          <p className="text-sm">点击"添加供应商"按钮开始添加</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 系统预置供应商 */}
          {providers.filter(p => p.isSystem).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">系统预置</span>
                <span>系统预置供应商</span>
              </h3>
              <div className="space-y-4">
                {providers.filter(p => p.isSystem).map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleEnabled={handleToggleEnabled}
                    onFetchModels={handleFetchModels}
                    onUpdateModel={handleUpdateModel}
                    onUpdateVoice={handleUpdateVoice}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 用户自定义供应商 */}
          {providers.filter(p => !p.isSystem).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">用户自定义</span>
                <span>用户自定义供应商</span>
              </h3>
              <div className="space-y-4">
                {providers.filter(p => !p.isSystem).map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleEnabled={handleToggleEnabled}
                    onFetchModels={handleFetchModels}
                    onUpdateModel={handleUpdateModel}
                    onUpdateVoice={handleUpdateVoice}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 统计信息 */}
      {providers.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              共 {providers.length} 个供应商，其中 {providers.filter(p => p.enabled).length} 个已启用
            </span>
            <div className="flex gap-4">
              <span>
                ASR: {providers.filter(p => (p.serviceType === 'asr' || p.serviceType === 'both') && p.enabled).length}
              </span>
              <span>
                TTS: {providers.filter(p => (p.serviceType === 'tts' || p.serviceType === 'both') && p.enabled).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

