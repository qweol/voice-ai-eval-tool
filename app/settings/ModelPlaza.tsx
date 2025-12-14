'use client';

import { useState, useEffect } from 'react';
import { GenericProviderConfig, ModelDefinition } from '@/lib/providers/generic/types';
import { getAllTemplates } from '@/lib/providers/generic/template-loader';

interface ModelPlazaProps {
  providers: GenericProviderConfig[];
}

export default function ModelPlaza({ providers }: ModelPlazaProps) {
  const [allModels, setAllModels] = useState<Array<{
    model: ModelDefinition;
    provider: GenericProviderConfig;
    templateName: string;
  }>>([]);
  const [filterType, setFilterType] = useState<'all' | 'asr' | 'tts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadAllModels = async () => {
      const templates = await getAllTemplates();
      const modelsList: Array<{
        model: ModelDefinition;
        provider: GenericProviderConfig;
        templateName: string;
      }> = [];

      providers.forEach(provider => {
        if (!provider.enabled) return;

        const template = templates.find(t => t.id === provider.templateType);
        if (!template?.models) return;

        template.models.forEach(model => {
          // 根据服务类型过滤
          if (provider.serviceType === 'asr' && model.type !== 'asr') return;
          if (provider.serviceType === 'tts' && model.type !== 'tts') return;

          modelsList.push({
            model,
            provider,
            templateName: template.name,
          });
        });
      });

      setAllModels(modelsList);
    };

    loadAllModels();
  }, [providers]);

  const filteredModels = allModels.filter(item => {
    // 类型过滤
    if (filterType !== 'all' && item.model.type !== filterType) {
      return false;
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.model.name.toLowerCase().includes(query) ||
        item.model.description?.toLowerCase().includes(query) ||
        item.provider.name.toLowerCase().includes(query) ||
        item.templateName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const asrModels = filteredModels.filter(m => m.model.type === 'asr');
  const ttsModels = filteredModels.filter(m => m.model.type === 'tts');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">模型广场</h2>
        <p className="text-sm text-gray-600">
          查看所有已配置供应商提供的语音模型
        </p>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模型名称、描述或供应商..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterType('asr')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'asr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ASR ({asrModels.length})
            </button>
            <button
              onClick={() => setFilterType('tts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'tts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              TTS ({ttsModels.length})
            </button>
          </div>
        </div>
      </div>

      {/* 模型列表 */}
      {filteredModels.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">没有找到模型</p>
          <p className="text-sm">
            {searchQuery ? '尝试调整搜索条件' : '请先添加并启用供应商'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ASR模型 */}
          {filterType !== 'tts' && asrModels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  ASR 语音识别
                </span>
                <span className="text-sm text-gray-500 font-normal">
                  {asrModels.length} 个模型
                </span>
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {asrModels.map((item, index) => (
                  <div
                    key={`${item.provider.id}-${item.model.id}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{item.model.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{item.provider.name}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        ASR
                      </span>
                    </div>
                    {item.model.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.model.description}</p>
                    )}
                    <div className="space-y-1 text-xs text-gray-500">
                      {item.model.supportedLanguages && (
                        <div>
                          <span className="font-medium">支持语言:</span>{' '}
                          {item.model.supportedLanguages.slice(0, 5).join(', ')}
                          {item.model.supportedLanguages.length > 5 && '...'}
                        </div>
                      )}
                      {item.model.maxFileSize && (
                        <div>
                          <span className="font-medium">最大文件:</span>{' '}
                          {(item.model.maxFileSize / 1024 / 1024).toFixed(0)}MB
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TTS模型 */}
          {filterType !== 'asr' && ttsModels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                  TTS 语音合成
                </span>
                <span className="text-sm text-gray-500 font-normal">
                  {ttsModels.length} 个模型
                </span>
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ttsModels.map((item, index) => (
                  <div
                    key={`${item.provider.id}-${item.model.id}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{item.model.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{item.provider.name}</p>
                      </div>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        TTS
                      </span>
                    </div>
                    {item.model.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.model.description}</p>
                    )}
                    <div className="space-y-2">
                      {item.model.voices && item.model.voices.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">音色:</span> {item.model.voices.length} 种
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.model.voices.slice(0, 4).map((voice) => (
                              <span
                                key={voice.id}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {voice.name}
                              </span>
                            ))}
                            {item.model.voices.length > 4 && (
                              <span className="px-2 py-0.5 text-gray-400 text-xs">
                                +{item.model.voices.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {item.model.speedRange && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">语速范围:</span>{' '}
                          {item.model.speedRange[0]}x - {item.model.speedRange[1]}x
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 统计信息 */}
      {filteredModels.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              共找到 {filteredModels.length} 个模型
              {filterType === 'all' && (
                <>（ASR: {asrModels.length}, TTS: {ttsModels.length}）</>
              )}
            </span>
            <span>
              来自 {new Set(filteredModels.map(m => m.provider.id)).size} 个供应商
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

