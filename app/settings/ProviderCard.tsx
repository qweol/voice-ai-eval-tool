'use client';

import { useState, useEffect } from 'react';
import { GenericProviderConfig, ModelDefinition, VoiceDefinition } from '@/lib/providers/generic/types';
import { getAllTemplates } from '@/lib/providers/generic/template-loader';

interface ProviderCardProps {
  provider: GenericProviderConfig;
  onEdit: (provider: GenericProviderConfig) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onFetchModels?: (providerId: string) => Promise<void>;
  onUpdateModel?: (id: string, serviceType: 'asr' | 'tts', modelId: string) => void;
  onUpdateVoice?: (id: string, voiceId: string) => void;
}

export default function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onToggleEnabled,
  onFetchModels,
  onUpdateModel,
  onUpdateVoice,
}: ProviderCardProps) {
  const [showModels, setShowModels] = useState(false);
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // 存储从 API 获取的 Minimax 音色列表
  const [minimaxVoices, setMinimaxVoices] = useState<VoiceDefinition[]>([]);

  // 对于 Minimax 供应商，自动加载音色列表
  useEffect(() => {
    if (provider.templateType === 'minimax' && expanded) {
      const loadMinimaxVoices = async () => {
        try {
          const response = await fetch('/api/providers/minimax/voices');
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setMinimaxVoices(data.data);
            console.log(`✅ 成功加载 ${data.data.length} 个 Minimax 音色`);
          }
        } catch (error: any) {
          console.error('❌ 加载 Minimax 音色列表失败:', error.message);
        }
      };
      loadMinimaxVoices();
    }
  }, [provider.templateType, expanded]);

  const handleFetchModels = async () => {
    setLoadingModels(true);
    try {
      // 先从模板中获取模型列表
      const templates = await getAllTemplates();
      const template = templates.find(t => t.id === provider.templateType);
      
      if (template?.models) {
        const providerModels = template.models.filter(m => {
          if (provider.serviceType === 'asr') return m.type === 'asr';
          if (provider.serviceType === 'tts') return m.type === 'tts';
          return true;
        });
        setModels(providerModels);
        setShowModels(true);
      } else {
        // 如果模板中没有模型，尝试从API获取
        if (onFetchModels) {
          await onFetchModels(provider.id);
        }
        
        // 尝试调用API获取模型列表（仅对OpenAI兼容的API）
        if (provider.templateType === 'openai' && provider.apiKey) {
          try {
            const response = await fetch('/api/providers/fetch-models', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                providerId: provider.id,
                providerConfig: provider,
              }),
            });
            
            const data = await response.json();
            if (data.success && data.models && data.models.length > 0) {
              setModels(data.models);
              setShowModels(true);
            }
          } catch (apiError) {
            console.error('从API获取模型失败:', apiError);
          }
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const getStatusColor = () => {
    if (!provider.enabled) return 'bg-gray-100 text-gray-600';
    return 'bg-green-100 text-green-700';
  };

  const getServiceTypeBadge = () => {
    const badges = [];
    if (provider.serviceType === 'asr' || provider.serviceType === 'both') {
      badges.push(<span key="asr" className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">ASR</span>);
    }
    if (provider.serviceType === 'tts' || provider.serviceType === 'both') {
      badges.push(<span key="tts" className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">TTS</span>);
    }
    return badges;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">{provider.name}</h3>
            {provider.isSystem && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                系统预置
              </span>
            )}
            <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor()}`}>
              {provider.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {getServiceTypeBadge()}
            {provider.templateType && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {provider.templateType}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 truncate" title={provider.apiUrl}>
            {provider.apiUrl}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={provider.enabled}
              onChange={(e) => onToggleEnabled(provider.id, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title={expanded ? '收起' : '展开'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">API地址:</span>
              <p className="text-gray-800 font-mono text-xs break-all">{provider.apiUrl}</p>
            </div>
            <div>
              <span className="text-gray-600">认证方式:</span>
              <p className="text-gray-800">{provider.authType}</p>
            </div>
            {provider.selectedModels?.asr && (
              <div>
                <span className="text-gray-600">ASR模型:</span>
                <p className="text-gray-800">{provider.selectedModels.asr}</p>
              </div>
            )}
            {provider.selectedModels?.tts && (
              <div>
                <span className="text-gray-600">TTS模型:</span>
                <p className="text-gray-800">{provider.selectedModels.tts}</p>
              </div>
            )}
          </div>

          {/* 模型列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">可用模型</h4>
              <button
                onClick={handleFetchModels}
                disabled={loadingModels}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {loadingModels ? '加载中...' : '🔄 刷新模型列表'}
              </button>
            </div>

            {showModels && models.length > 0 ? (
              <div className="space-y-2">
                {models.map((model) => {
                  const isSelected = model.type === 'asr'
                    ? provider.selectedModels?.asr === model.id
                    : provider.selectedModels?.tts === model.id;

                  return (
                    <div
                      key={model.id}
                      className={`p-2 rounded border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-800">{model.name}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                当前使用
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <p className="text-xs text-gray-600 mt-1">{model.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            model.type === 'asr'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {model.type.toUpperCase()}
                          </span>
                          {onUpdateModel && !isSelected && (
                            <button
                              onClick={() => onUpdateModel(provider.id, model.type, model.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              选择
                            </button>
                          )}
                        </div>
                      </div>
                      {model.type === 'tts' && (() => {
                        // 对于 Minimax，优先使用从 API 获取的音色列表
                        const voices = provider.templateType === 'minimax' && minimaxVoices.length > 0
                          ? minimaxVoices
                          : model.voices || [];
                        
                        if (voices.length === 0) return null;
                        
                        return (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1">
                              音色 ({voices.length}种)
                              {provider.templateType === 'minimax' && minimaxVoices.length > 0 && (
                                <span className="text-green-600 ml-1">(已从API加载)</span>
                              )}
                            </p>
                            {isSelected && onUpdateVoice ? (
                              <select
                                value={provider.selectedVoice || voices[0].id}
                                onChange={(e) => onUpdateVoice(provider.id, e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {voices.map((voice) => (
                                  <option key={voice.id} value={voice.id}>
                                    {voice.name} {voice.description ? `- ${voice.description}` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {voices.slice(0, 5).map((voice) => (
                                  <span
                                    key={voice.id}
                                    className="px-2 py-0.5 bg-white text-xs rounded border border-gray-200"
                                  >
                                    {voice.name}
                                  </span>
                                ))}
                                {voices.length > 5 && (
                                  <span className="px-2 py-0.5 text-xs text-gray-500">
                                    +{voices.length - 5} 更多
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                {loadingModels ? '正在加载模型列表...' : '点击"刷新模型列表"获取可用模型'}
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          {provider.isSystem ? (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-700 mb-1">系统预置供应商</p>
                <p className="text-xs">此供应商由系统管理员配置，不可编辑或删除。您可以通过上方的开关来启用或禁用此供应商。</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => onEdit(provider)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm(`确定要删除供应商 "${provider.name}" 吗？`)) {
                    onDelete(provider.id);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

