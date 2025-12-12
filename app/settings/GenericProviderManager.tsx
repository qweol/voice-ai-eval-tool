'use client';

import { useState, useEffect } from 'react';
import { GenericProviderConfig, TemplateType, APITemplate, ModelDefinition } from '@/lib/providers/generic/types';
import { templates, createConfigFromTemplate } from '@/lib/providers/generic/templates';
import { addProvider, updateProvider, removeProvider, getConfig, saveConfig } from '@/lib/utils/config';

interface GenericProviderManagerProps {
  providers: GenericProviderConfig[];
  onUpdate: () => void;
}

export default function GenericProviderManager({ providers, onUpdate }: GenericProviderManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<GenericProviderConfig>>({
    name: '',
    serviceType: 'both',
    templateType: 'openai',
    apiUrl: '',
    method: 'POST',
    authType: 'bearer',
    apiKey: '',
    enabled: true,
    selectedModels: {},
    selectedVoice: '',
    customModels: {},
  });

  // 当前选择的模板
  const [selectedTemplate, setSelectedTemplate] = useState<APITemplate | null>(null);

  // 可用的模型列表
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

        // 如果没有选择模型，使用默认模型
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
  }, [formData.templateType]);

  const handleTemplateChange = (templateType: TemplateType) => {
    const template = templates[templateType];

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
      requestBody: requestBody,
      responseTextPath: template.responseTextPath,
      responseAudioPath: template.responseAudioPath,
      responseAudioFormat: template.responseAudioFormat,
      errorPath: template.errorPath,
    });
  };

  const handleAdd = () => {
    if (!formData.name || !formData.apiUrl) {
      alert('请填写名称和API地址');
      return;
    }

    const newProvider: GenericProviderConfig = {
      id: `generic-${Date.now()}`,
      name: formData.name,
      type: 'generic',
      serviceType: formData.serviceType || 'both',
      apiUrl: formData.apiUrl,
      method: formData.method || 'POST',
      authType: formData.authType || 'bearer',
      apiKey: formData.apiKey || '',
      authHeader: formData.authHeader,
      requestBody: formData.requestBody,
      requestHeaders: formData.requestHeaders,
      responseTextPath: formData.responseTextPath,
      responseAudioPath: formData.responseAudioPath,
      responseAudioFormat: formData.responseAudioFormat,
      errorPath: formData.errorPath,
      templateType: formData.templateType,
      enabled: formData.enabled !== false,
    };

    addProvider(newProvider);
    setShowAddForm(false);
    setFormData({
      name: '',
      serviceType: 'both',
      templateType: 'openai',
      apiUrl: '',
      method: 'POST',
      authType: 'bearer',
      apiKey: '',
      enabled: true,
    });
    onUpdate();
  };

  const handleEdit = (provider: GenericProviderConfig) => {
    setEditingId(provider.id);
    setFormData(provider);
    setShowAddForm(true);
  };

  const handleUpdate = () => {
    if (!editingId) return;

    updateProvider(editingId, formData);
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
      enabled: true,
    });
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个API配置吗？')) {
      removeProvider(id);
      onUpdate();
    }
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    updateProvider(id, { enabled: !enabled });
    onUpdate();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">大模型API配置</h2>
          <p className="text-sm text-gray-600 mt-1">
            添加自定义的大模型API，支持OpenAI、Qwen、豆包等格式
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
              enabled: true,
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? '取消' : '+ 添加API'}
        </button>
      </div>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '编辑API配置' : '添加新API'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名称 *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：我的Whisper模型"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板类型
              </label>
              <select
                value={formData.templateType || 'openai'}
                onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai">OpenAI风格</option>
                <option value="qwen">Qwen风格</option>
                <option value="doubao">豆包风格</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服务类型
              </label>
              <select
                value={formData.serviceType || 'both'}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asr">仅ASR</option>
                <option value="tts">仅TTS</option>
                <option value="both">ASR和TTS</option>
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
                placeholder="https://api.example.com/v1/audio/transcriptions"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTTP方法
                </label>
                <select
                  value={formData.method || 'POST'}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  认证类型
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API密钥
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      selectedModels: { ...formData.selectedModels, tts: modelId },
                      selectedVoice: '', // 清空音色选择
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {formData.serviceType !== 'asr' && formData.selectedModels?.tts && (() => {
              const model = availableModels.tts.find(m => m.id === formData.selectedModels?.tts);
              return model?.voices && model.voices.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    音色
                  </label>
                  <select
                    value={formData.selectedVoice || ''}
                    onChange={(e) => setFormData({ ...formData, selectedVoice: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择音色</option>
                    {model.voices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender}) {voice.description ? `- ${voice.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null;
            })()}

            {/* 自定义模型（可选） */}
            {selectedTemplate?.allowCustomModel && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  使用自定义模型名称（适用于中转站）
                </summary>
                <div className="space-y-2 mt-2">
                  {formData.serviceType !== 'tts' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        自定义ASR模型名称
                      </label>
                      <input
                        type="text"
                        placeholder="例如：whisper-large-v3"
                        value={formData.customModels?.asr || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          customModels: { ...formData.customModels, asr: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {formData.serviceType !== 'asr' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        自定义TTS模型名称
                      </label>
                      <input
                        type="text"
                        placeholder="例如：tts-1-hd-1106"
                        value={formData.customModels?.tts || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          customModels: { ...formData.customModels, tts: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 如果填写了自定义模型名称，将优先使用自定义名称而非上方选择的模型
                  </p>
                </div>
              </details>
            )}

            {/* 高级选项 */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                高级选项
              </summary>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    请求体模板（JSON，支持变量：{'{text}'}, {'{audio}'}, {'{model}'}等）
                  </label>
                  <textarea
                    value={formData.requestBody || ''}
                    onChange={(e) => setFormData({ ...formData, requestBody: e.target.value })}
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder='{"model": "{model}", "audio": "{audio}"}'
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      响应文本路径（ASR）
                    </label>
                    <input
                      type="text"
                      value={formData.responseTextPath || ''}
                      onChange={(e) => setFormData({ ...formData, responseTextPath: e.target.value })}
                      placeholder="text 或 result.text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      响应音频路径（TTS）
                    </label>
                    <input
                      type="text"
                      value={formData.responseAudioPath || ''}
                      onChange={(e) => setFormData({ ...formData, responseAudioPath: e.target.value })}
                      placeholder="audio 或 result.audio"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </details>

            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled !== false}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">启用</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? '更新' : '添加'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 已配置的API列表 */}
      <div className="space-y-3">
        {providers.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无配置的API，点击上方"添加API"开始配置</p>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{provider.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {provider.templateType || 'custom'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {provider.serviceType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{provider.apiUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={() => handleToggleEnabled(provider.id, provider.enabled)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                  <button
                    onClick={() => handleEdit(provider)}
                    className="text-blue-600 hover:text-blue-800 text-sm px-2"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="text-red-600 hover:text-red-800 text-sm px-2"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
