'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Tag } from 'lucide-react';
import { getConfig, getAllEnabledProvidersWithSystem, createBadCase } from '@/lib/utils/config';
import { GenericProviderConfig, VoiceDefinition } from '@/lib/providers/generic/types';
import { templates } from '@/lib/providers/generic/templates';
import { BadCaseStatus, BadCaseSeverity } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

interface TTSResult {
  provider: string;
  audioUrl: string;
  duration: number;
  ttfb?: number | null;
  totalTime?: number;
  status: string;
  error?: string;
  providerLatencyMs?: number;
  providerDurationSec?: number;
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
  // 存储每个 provider 的动态音色列表（从 API 获取）
  const [providerVoicesMap, setProviderVoicesMap] = useState<Record<string, VoiceDefinition[]>>({});

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

      // 对于 Minimax 供应商，从 API 获取可用音色列表
      const minimaxProviders = ttsProviders.filter(p => p.templateType === 'minimax');
      if (minimaxProviders.length > 0) {
        const loadMinimaxVoices = async () => {
          try {
            const response = await fetch('/api/providers/minimax/voices');
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              const voicesMap: Record<string, VoiceDefinition[]> = {};
              minimaxProviders.forEach(provider => {
                voicesMap[provider.id] = data.data;
              });
              setProviderVoicesMap(prev => ({ ...prev, ...voicesMap }));
              console.log(`✅ 成功加载 ${data.data.length} 个 Minimax 音色`);
            } else {
              console.warn('⚠️ Minimax 音色列表为空，使用默认音色');
            }
          } catch (error: any) {
            console.error('❌ 加载 Minimax 音色列表失败:', error.message);
          }
        };
        loadMinimaxVoices();
      }
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
    // 移除错误的逻辑：不应该修改 enabledProviders，它只是用于显示列表
    // enabled 状态由 providerVoices 中的 enabled 字段控制
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
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4 font-bold transition-colors">
            <ArrowLeft size={18} strokeWidth={2.5} />
            返回首页
          </Link>
          <h1 className="text-5xl font-heading font-extrabold text-foreground mb-3">
            TTS 语音合成对比
          </h1>
          <p className="text-xl text-mutedForeground">
            输入文本，对比多个供应商的合成效果
          </p>
        </div>

        {/* 文本输入区域 */}
        <Card className="mb-8" hover={false}>
          <CardHeader>
            <h2 className="text-2xl font-heading font-bold">输入文本</h2>
          </CardHeader>
          <CardContent>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="请输入要合成的文本，例如：北京市海淀区中关村软件园"
              className="h-32 mb-6"
            />

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <Button
                onClick={handleCompare}
                disabled={!text.trim() || loading || providerVoices.filter(pv => pv.enabled).length === 0}
                showArrow={true}
              >
                {loading ? '合成中...' : '开始合成'}
              </Button>

              <div className="text-sm text-mutedForeground font-medium">
                字数: <span className="text-foreground font-bold">{text.length}</span>
              </div>

              {providerVoices.filter(pv => pv.enabled).length === 0 && enabledProviders.length > 0 && (
                <Link
                  href="/settings"
                  className="text-sm text-accent hover:text-accent/80 font-bold underline"
                >
                  请先配置API密钥
                </Link>
              )}
            </div>

            {/* 参数调整 */}
            <div className="border-t-2 border-border pt-6 mt-6">
              <h3 className="text-xl font-heading font-bold mb-4">合成参数</h3>
              <div className="max-w-md">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                    语速: <span className="text-accent">{speed.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-xs text-mutedForeground mt-2 font-medium">
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 供应商和音色选择 */}
            <div className="border-t-2 border-border pt-6 mt-6">
            <h3 className="text-xl font-heading font-bold mb-4">供应商与音色选择</h3>
            <div className="space-y-3">
              {enabledProviders.map((provider) => {
                const pv = providerVoices.find((v) => v.providerId === provider.id);

                if (!pv) return null;

                // 获取该Provider可用的音色列表
                const getAvailableVoices = (): VoiceDefinition[] => {
                  // 对于 Minimax，优先使用从 API 获取的音色列表
                  if (provider.templateType === 'minimax') {
                    const apiVoices = providerVoicesMap[provider.id];
                    if (apiVoices && apiVoices.length > 0) {
                      return apiVoices;
                    }
                    // 如果 API 查询失败，使用模板中的默认音色
                    console.warn('⚠️ Minimax 音色列表未加载，使用模板默认音色');
                  }

                  // 其他供应商从模板获取
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
                  <Card key={provider.id} featured={false} hover={false} className="mb-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center cursor-pointer min-w-[200px]">
                        <input
                          type="checkbox"
                          checked={pv.enabled}
                          onChange={() => toggleProvider(provider.id)}
                          className="w-5 h-5 rounded border-2 border-foreground accent-accent cursor-pointer"
                        />
                        <div className="flex flex-col ml-3">
                          <span className="font-bold text-foreground">{provider.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-accent text-accentForeground rounded-full font-bold">
                              {provider.templateType || 'custom'}
                            </span>
                            {provider.selectedModels?.tts && (
                              <span className="text-xs px-2 py-0.5 bg-quaternary text-white rounded-full font-bold">
                                {provider.selectedModels.tts}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                      {pv.enabled && (
                        <div className="flex-1 min-w-[200px]">
                          {availableVoices.length > 0 ? (
                            <select
                              value={pv.voice}
                              onChange={(e) => updateProviderVoice(provider.id, e.target.value)}
                              className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                            >
                              {availableVoices.map(voice => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.name} ({voice.gender}) {voice.description ? `- ${voice.description}` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-mutedForeground italic">
                              未配置模型或模型不支持音色选择
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            {enabledProviders.length === 0 && (
              <p className="text-sm text-mutedForeground mt-2">
                提示：请先在设置页面配置API密钥并启用供应商
              </p>
            )}
            </div>
          </CardContent>
        </Card>

        {/* 加载状态 */}
        {loading && (
          <Card className="text-center" hover={false}>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4"></div>
            <p className="text-mutedForeground font-medium">正在调用各供应商 API 进行合成...</p>
          </Card>
        )}

        {/* 结果展示 */}
        {results.length > 0 && !loading && (
          <Card hover={false}>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-heading font-bold">合成结果对比</h2>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={playAll}
                  variant="secondary"
                  className="text-sm"
                >
                  <Play size={16} strokeWidth={2.5} className="mr-2" />
                  一键播放全部
                </Button>
                <Button
                  onClick={handleMarkAllAsBadCase}
                  variant="secondary"
                  className="text-sm"
                >
                  <Tag size={16} strokeWidth={2.5} className="mr-2" />
                  批量标记为 BadCase
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {results.map((result, i) => (
                <Card key={i} featured={false} hover={false} className="mb-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <h3 className="text-xl font-heading font-bold text-foreground">
                      {result.provider}
                    </h3>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-1 text-sm text-mutedForeground">
                        <div className="flex gap-4">
                          <span className="font-medium">首token: <span className="text-foreground font-bold">{result.ttfb != null ? `${result.ttfb}ms` : '-'}</span></span>
                          <span className="font-medium">总耗时: <span className="text-foreground font-bold">{result.totalTime != null ? `${result.totalTime}ms` : '-'}</span></span>
                        </div>
                      </div>
                      {result.status === 'success' ? (
                        <span className="px-3 py-1 bg-quaternary text-white rounded-full font-bold text-sm">✓ 成功</span>
                      ) : (
                        <span className="px-3 py-1 bg-red-500 text-white rounded-full font-bold text-sm">✗ 失败</span>
                      )}
                    </div>
                  </div>

                  {result.status === 'success' ? (
                    <>
                      <div className="bg-muted rounded-lg p-4 mb-4 border-2 border-border">
                        <audio
                          id={`audio-${i}`}
                          controls
                          src={result.audioUrl}
                          className="w-full"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleMarkAsBadCase(result)}
                          variant="secondary"
                          className="text-sm"
                        >
                          <Tag size={14} strokeWidth={2.5} className="mr-2" />
                          标记为 BadCase
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <p className="text-red-600 text-sm font-medium">
                        {result.error || '合成失败'}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* 统计信息 */}
            <Card featured={false} hover={false} className="mt-6 bg-accent/10 border-accent">
              <h3 className="font-heading font-bold text-foreground mb-4">统计信息</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-mutedForeground">总供应商数:</span>{' '}
                  <span className="font-bold text-foreground">{results.length}</span>
                </div>
                <div>
                  <span className="text-mutedForeground">成功:</span>{' '}
                  <span className="font-bold text-quaternary">
                    {results.filter(r => r.status === 'success').length}
                  </span>
                </div>
                <div>
                  <span className="text-mutedForeground">失败:</span>{' '}
                  <span className="font-bold text-red-600">
                    {results.filter(r => r.status === 'failed').length}
                  </span>
                </div>
              </div>
            </Card>
          </Card>
        )}
      </div>
    </div>
  );
}
