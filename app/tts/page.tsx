'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getConfig, getAllEnabledProvidersWithSystem, createBadCase } from '@/lib/utils/config';
import { GenericProviderConfig, VoiceDefinition } from '@/lib/providers/generic/types';
import { templates } from '@/lib/providers/generic/templates';
import { BadCaseStatus, BadCaseSeverity } from '@/lib/types';

interface TTSResult {
  provider: string;
  audioUrl: string;
  duration: number;
  status: string;
  error?: string;
}

interface ProviderVoice {
  providerId: string;
  voice: string;
  enabled: boolean;
}

export default function TTSPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [results, setResults] = useState<TTSResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [providerVoices, setProviderVoices] = useState<ProviderVoice[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<GenericProviderConfig[]>([]);

  useEffect(() => {
    const config = getConfig();
    setSpeed(config.tts.defaultSpeed);

    // 获取所有启用的提供者（包括系统预置）
    const loadProviders = async () => {
      const allProviders = await getAllEnabledProvidersWithSystem();

      // 筛选支持TTS的提供者
      const ttsProviders = allProviders.filter((p) => {
        return p.serviceType === 'tts' || p.serviceType === 'both';
      });

      // 初始化供应商音色配置
      const voices = ttsProviders.map((p) => {
        // 获取Provider配置的音色，如果没有则使用默认音色
        let defaultVoice = p.selectedVoice || '';

        // 如果Provider没有配置音色，尝试从模板获取默认音色
        if (!defaultVoice && p.templateType) {
          const template = templates[p.templateType];
          if (template.models) {
            const ttsModel = template.models.find(
              m => m.type === 'tts' && m.id === p.selectedModels?.tts
            );
            if (ttsModel?.voices && ttsModel.voices.length > 0) {
              defaultVoice = ttsModel.voices[0].id;
            }
          }
        }

        return {
          providerId: p.id,
          voice: defaultVoice || 'alloy',
          enabled: true,
        };
      });

      setProviderVoices(voices);
      setEnabledProviders(ttsProviders);
    };

    loadProviders();
  }, []);

  const updateProviderVoice = (providerId: string, voice: string) => {
    setProviderVoices((prev) =>
      prev.map((pv) => {
        if (pv.providerId === providerId) {
          return { ...pv, voice };
        }
        return pv;
      })
    );
  };

  const toggleProvider = (providerId: string) => {
    setProviderVoices((prev) =>
      prev.map((pv) => {
        if (pv.providerId === providerId) {
          return { ...pv, enabled: !pv.enabled };
        }
        return pv;
      })
    );
    setEnabledProviders((prev) =>
      prev.filter((p) => p.id !== providerId)
    );
  };

  const handleCompare = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      // 获取所有启用的供应商（包括系统预置）
      const allProviders = await getAllEnabledProvidersWithSystem();
      const providers = allProviders.filter(
        (p) => p.serviceType === 'tts' || p.serviceType === 'both'
      );

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: {
            speed,
          },
          providerVoices: providerVoices.filter((pv) => pv.enabled),
          providers,
        }),
      });

      if (!res.ok) {
        throw new Error('合成失败');
      }

      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error:', error);
      alert('合成过程出错，请检查配置或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const playAll = () => {
    results.forEach((result, index) => {
      if (result.status === 'success') {
        setTimeout(() => {
          const audio = document.getElementById(`audio-${index}`) as HTMLAudioElement;
          if (audio) {
            audio.play();
          }
        }, index * 3000); // 每个音频间隔3秒播放
      }
    });
  };

  // 标记为 BadCase
  const handleMarkAsBadCase = (result: TTSResult) => {
    // 收集所有成功的音频 URL
    const audioUrls: Record<string, string> = {};
    results.forEach(r => {
      if (r.status === 'success') {
        audioUrls[r.provider] = r.audioUrl;
      }
    });

    // 创建 BadCase
    const badCase = createBadCase({
      text,
      category: 'OTHER', // 默认分类，用户可以后续修改
      severity: BadCaseSeverity.MAJOR,
      status: BadCaseStatus.OPEN,
      description: `从 TTS 测试标记，供应商: ${result.provider}`,
      audioUrls,
      priority: 3,
      tags: ['TTS测试', result.provider],
    });

    if (confirm(`已标记为 BadCase！\n\nID: ${badCase.id}\n\n是否立即查看详情？`)) {
      router.push(`/badcases/${badCase.id}`);
    }
  };

  // 批量标记为 BadCase
  const handleMarkAllAsBadCase = () => {
    const successResults = results.filter(r => r.status === 'success');

    if (successResults.length === 0) {
      alert('没有成功的合成结果可以标记');
      return;
    }

    // 收集所有成功的音频 URL
    const audioUrls: Record<string, string> = {};
    successResults.forEach(r => {
      audioUrls[r.provider] = r.audioUrl;
    });

    // 创建 BadCase
    const badCase = createBadCase({
      text,
      category: 'OTHER',
      severity: BadCaseSeverity.MAJOR,
      status: BadCaseStatus.OPEN,
      description: `从 TTS 测试批量标记，包含 ${successResults.length} 个供应商`,
      audioUrls,
      priority: 3,
      tags: ['TTS测试', '批量标记'],
    });

    if (confirm(`已创建 BadCase！\n\nID: ${badCase.id}\n包含 ${successResults.length} 个供应商的音频\n\n是否立即查看详情？`)) {
      router.push(`/badcases/${badCase.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            TTS 语音合成对比
          </h1>
          <p className="text-gray-600">
            输入文本，对比多个供应商的合成效果
          </p>
        </div>

        {/* 文本输入区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">输入文本</h2>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入要合成的文本，例如：北京市海淀区中关村软件园"
            className="w-full border border-gray-300 rounded-lg p-4 h-32 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleCompare}
              disabled={!text.trim() || loading || enabledProviders.length === 0}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold
                hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors"
            >
              {loading ? '合成中...' : '开始合成'}
            </button>

            <div className="text-sm text-gray-500">
              字数: {text.length}
            </div>

            {enabledProviders.length === 0 && (
              <Link
                href="/settings"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                请先配置API密钥
              </Link>
            )}
          </div>

          {/* 参数调整 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">合成参数</h3>
            <div className="max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  语速: {speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>
          </div>

          {/* 供应商和音色选择 */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">供应商与音色选择</h3>
            <div className="space-y-3">
              {enabledProviders.map((provider) => {
                const pv = providerVoices.find((v) => v.providerId === provider.id);

                if (!pv) return null;

                // 获取该Provider可用的音色列表
                const getAvailableVoices = (): VoiceDefinition[] => {
                  if (!provider.templateType) return [];

                  const template = templates[provider.templateType];
                  if (!template.models) return [];

                  const ttsModel = template.models.find(
                    m => m.type === 'tts' && m.id === provider.selectedModels?.tts
                  );

                  return ttsModel?.voices || [];
                };

                const availableVoices = getAvailableVoices();

                return (
                  <div key={provider.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center cursor-pointer min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={pv.enabled}
                        onChange={() => toggleProvider(provider.id)}
                        className="mr-2"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{provider.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {provider.templateType || 'custom'}
                          </span>
                          {provider.selectedModels?.tts && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              {provider.selectedModels.tts}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    {pv.enabled && (
                      <div className="flex-1">
                        {availableVoices.length > 0 ? (
                          <select
                            value={pv.voice}
                            onChange={(e) => updateProviderVoice(provider.id, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {availableVoices.map(voice => (
                              <option key={voice.id} value={voice.id}>
                                {voice.name} ({voice.gender}) {voice.description ? `- ${voice.description}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            未配置模型或模型不支持音色选择
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {enabledProviders.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                提示：请先在设置页面配置API密钥并启用供应商
              </p>
            )}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">正在调用各供应商 API 进行合成...</p>
          </div>
        )}

        {/* 结果展示 */}
        {results.length > 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">合成结果对比</h2>
              <div className="flex gap-2">
                <button
                  onClick={playAll}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold
                    hover:bg-green-700 transition-colors"
                >
                  🔊 一键播放全部
                </button>
                <button
                  onClick={handleMarkAllAsBadCase}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold
                    hover:bg-orange-700 transition-colors"
                >
                  🏷️ 批量标记为 BadCase
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {results.map((result, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {result.provider}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        耗时: {result.duration.toFixed(2)}s
                      </span>
                      {result.status === 'success' ? (
                        <span className="text-green-600 font-semibold text-sm">✓ 成功</span>
                      ) : (
                        <span className="text-red-600 font-semibold text-sm">✗ 失败</span>
                      )}
                    </div>
                  </div>

                  {result.status === 'success' ? (
                    <>
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <audio
                          id={`audio-${i}`}
                          controls
                          src={result.audioUrl}
                          className="w-full"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleMarkAsBadCase(result)}
                          className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors border border-orange-300"
                        >
                          🏷️ 标记为 BadCase
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-red-50 rounded p-3">
                      <p className="text-red-600 text-sm">
                        {result.error || '合成失败'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">统计信息</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">总供应商数:</span>{' '}
                  <span className="font-semibold">{results.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">成功:</span>{' '}
                  <span className="font-semibold text-green-600">
                    {results.filter(r => r.status === 'success').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">失败:</span>{' '}
                  <span className="font-semibold text-red-600">
                    {results.filter(r => r.status === 'failed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
