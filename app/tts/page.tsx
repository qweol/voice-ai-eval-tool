'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Tag } from 'lucide-react';
import { getConfig, getAllEnabledProvidersWithSystem, createBadCase } from '@/lib/utils/config';
import { GenericProviderConfig, VoiceDefinition, ModelDefinition } from '@/lib/providers/generic/types';
import { templates } from '@/lib/providers/generic/templates';
import { BadCaseStatus, BadCaseSeverity } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

interface TTSResult {
  provider: string;
  runIndex?: number;
  providerId?: string;
  modelId?: string;
  voice?: string;
  templateType?: string;
  audioUrl: string;
  duration: number;
  ttfb?: number | null;
  totalTime?: number;
  status: string;
  error?: string;
  providerLatencyMs?: number;
  providerDurationSec?: number;
  cost?: number;
  pricing?: {
    ruleId?: string;
    unit?: string;
    usageAmount?: number;
    originalAmount?: number;
    originalCurrency?: string;
    isEstimated?: boolean;
    exchangeRate?: number;
    notes?: string;
    meta?: any;
    warning?: string;
  };
}

interface ProviderVoice {
  providerId: string;
  voice: string;
  enabled: boolean;
  modelId?: string; // 添加模型ID字段
}

interface StatSummary {
  avg: number;
  min: number;
  max: number;
}

interface CostSummary {
  avg: number;
  sum: number;
}

interface ProviderGroup {
  provider: string;
  runs: TTSResult[];
  successCount: number;
  failedCount: number;
  stats: {
    ttfb: StatSummary | null;
    totalTime: StatSummary | null;
    cost: CostSummary | null;
  };
}

export default function TTSPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [results, setResults] = useState<TTSResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [cartesiaSpeed, setCartesiaSpeed] = useState(1.0); // Cartesia专用速度控制 (0.6-1.5)
  const [language, setLanguage] = useState('auto'); // 语言选择：auto, zh, en, yue
  const [batchCount, setBatchCount] = useState(3);
  const [ttsProgress, setTtsProgress] = useState<{
    status: string;
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    current?: { provider?: string; runIndex?: number };
  } | null>(null);
  const [providerVoices, setProviderVoices] = useState<ProviderVoice[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<GenericProviderConfig[]>([]);
  // 存储每个 provider 的动态音色列表（从 API 获取）
  const [providerVoicesMap, setProviderVoicesMap] = useState<Record<string, VoiceDefinition[]>>({});
  const [lastRunConfig, setLastRunConfig] = useState<{
    speed: number;
    batchCount: number;
    text: string;
    providerVoices: ProviderVoice[];
    providers: GenericProviderConfig[];
    startedAt: string;
  } | null>(null);

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
        let defaultModelId = p.selectedModels?.tts || '';

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
          modelId: defaultModelId,
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

  const updateProviderModel = (providerId: string, modelId: string) => {
    setProviderVoices((prev) =>
      prev.map((pv) => {
        if (pv.providerId === providerId) {
          // 切换模型时，需要重置音色为新模型的第一个音色
          const provider = enabledProviders.find(p => p.id === providerId);
          let newVoice = pv.voice;

          if (provider?.templateType) {
            const template = templates[provider.templateType];
            if (template.models) {
              const ttsModel = template.models.find(
                m => m.type === 'tts' && m.id === modelId
              );
              if (ttsModel?.voices && ttsModel.voices.length > 0) {
                newVoice = ttsModel.voices[0].id;
              }
            }
          }

          return { ...pv, modelId, voice: newVoice };
        }
        return pv;
      })
    );

    // 同时更新 enabledProviders 中的 selectedModels
    setEnabledProviders((prev) =>
      prev.map((p) => {
        if (p.id === providerId) {
          return {
            ...p,
            selectedModels: {
              ...p.selectedModels,
              tts: modelId,
            },
          };
        }
        return p;
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

  const handleCompare = async (opts?: { batchCount?: number }) => {
    if (!text.trim()) return;

    setLoading(true);
    setResults([]);
    setTtsProgress(null);

    try {
      // 使用 enabledProviders 状态，它包含了 UI 中更新的模型选择
      const providers = enabledProviders;
      const runBatchCount = opts?.batchCount ?? 1;
      const selectedProviderVoices = providerVoices.filter((pv) => pv.enabled);

      // 为每个供应商设置正确的速度参数
      const providersWithSpeed = providers.map(provider => {
        const providerSpeed = provider.templateType === 'cartesia' ? cartesiaSpeed : speed;
        return {
          ...provider,
          _speed: providerSpeed, // 临时存储速度值
        };
      });

      setLastRunConfig({
        speed,
        batchCount: runBatchCount,
        text,
        providerVoices: selectedProviderVoices,
        providers,
        startedAt: new Date().toISOString(),
      });

      const res = await fetch('/api/tts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: {
            speed, // 默认速度
            cartesiaSpeed, // Cartesia专用速度
            language, // 语言选择
          },
          batchCount: runBatchCount,
          providerVoices: selectedProviderVoices,
          providers: providersWithSpeed,
        }),
      });

      if (!res.ok) {
        throw new Error('合成失败');
      }

      const startData = await res.json();
      const jobId = startData?.data?.jobId as string | undefined;
      if (!jobId) {
        throw new Error('启动任务失败：缺少 jobId');
      }

      // 轮询进度（参考 batch-test 方式）
      const poll = async () => {
        const resp = await fetch(`/api/tts/execute?jobId=${encodeURIComponent(jobId)}`);
        if (!resp.ok) return;
        const progressJson = await resp.json();
        const progress = progressJson?.data;
        if (progress) {
          setTtsProgress(progress);
          if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
            // 优先使用进度响应中直接返回的结果（避免额外的请求和时序问题）
            if (progress.results !== undefined) {
              setResults(progress.results || []);
            } else {
              // 兜底：如果进度响应中没有结果，尝试从 result API 获取
              try {
                const resultResp = await fetch(`/api/tts/result?jobId=${encodeURIComponent(jobId)}`);
                if (resultResp.ok) {
                  const resultJson = await resultResp.json();
                  setResults(resultJson?.data?.results || []);
                } else {
                  console.warn('获取结果失败:', resultResp.status, resultResp.statusText);
                }
              } catch (error) {
                console.error('获取结果异常:', error);
              }
            }
            setLoading(false);
            return true;
          }
        }
        return false;
      };

      // 立即拉一次，避免空白
      await poll();
      const interval = setInterval(async () => {
        const done = await poll();
        if (done) clearInterval(interval);
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      alert('合成过程出错，请检查配置或稍后重试');
    } finally {
      // loading 由轮询结束时关闭；这里只在异常时兜底关闭（如果已开始轮询，会立刻被轮询逻辑再置为 false）
    }
  };

  const playAll = () => {
    const successAudios = Array.from(
      document.querySelectorAll<HTMLAudioElement>('audio[data-tts-audio="true"]')
    );
    successAudios.forEach((audio, index) => {
        setTimeout(() => {
            audio.play();
        }, index * 3000); // 每个音频间隔3秒播放
    });
  };

  // 标记为 BadCase（单次：只保存该次音频）
  const handleMarkAsBadCaseSingle = (result: TTSResult) => {
    const audioUrls: Record<string, string> = {
      [result.provider]: result.audioUrl,
    };

    const runInfo = result.runIndex ? ` (第${result.runIndex}次)` : '';
    const badCase = createBadCase({
      text,
      category: 'OTHER',
      severity: BadCaseSeverity.MAJOR,
      status: BadCaseStatus.OPEN,
      description: `从 TTS 测试标记，供应商: ${result.provider}${runInfo}`,
      audioUrls,
      priority: 3,
      tags: ['TTS测试', result.provider, ...(result.runIndex ? [`run:${result.runIndex}`] : [])],
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

    // 批量：每个供应商只取“第一条成功结果”，避免多次覆盖
    const audioUrls: Record<string, string> = {};
    successResults.forEach(r => {
      if (!audioUrls[r.provider]) {
      audioUrls[r.provider] = r.audioUrl;
      }
    });

    // 创建 BadCase
    const badCase = createBadCase({
      text,
      category: 'OTHER',
      severity: BadCaseSeverity.MAJOR,
      status: BadCaseStatus.OPEN,
      description: `从 TTS 测试批量标记（每供应商取首条成功结果），包含 ${Object.keys(audioUrls).length} 个供应商`,
      audioUrls,
      priority: 3,
      tags: ['TTS测试', '批量标记'],
    });

    const providerCount = Object.keys(audioUrls).length;
    if (confirm(`已创建 BadCase！\n\nID: ${badCase.id}\n包含 ${providerCount} 个供应商的音频\n\n是否立即查看详情？`)) {
      router.push(`/badcases/${badCase.id}`);
    }
  };

  const groupedResults = useMemo<ProviderGroup[]>(() => {
    if (results.length === 0) return [];

    const groups: Record<string, { provider: string; runs: TTSResult[] }> = {};
    results.forEach((result) => {
      const key = result.provider || '未知';
      if (!groups[key]) {
        groups[key] = { provider: key, runs: [] };
      }
      groups[key].runs.push(result);
    });

    const calcStat = (values: Array<number | null | undefined>): StatSummary | null => {
      const filtered = values.filter(
        (value): value is number => typeof value === 'number' && !Number.isNaN(value)
      );
      if (filtered.length === 0) return null;
      const sum = filtered.reduce((acc, curr) => acc + curr, 0);
      return {
        avg: sum / filtered.length,
        min: Math.min(...filtered),
        max: Math.max(...filtered),
      };
    };

    const buildCostSummary = (values: Array<number | null | undefined>): CostSummary | null => {
      const filtered = values.filter(
        (value): value is number => typeof value === 'number' && !Number.isNaN(value)
      );
      if (filtered.length === 0) return null;
      const sum = filtered.reduce((acc, curr) => acc + curr, 0);
      return {
        avg: sum / filtered.length,
        sum,
      };
    };

    return Object.values(groups).map((group) => {
      const successRuns = group.runs.filter((run) => run.status === 'success');
      const failedCount = group.runs.length - successRuns.length;

      return {
        provider: group.provider,
        runs: group.runs,
        successCount: successRuns.length,
        failedCount,
        stats: {
          ttfb: calcStat(successRuns.map((run) => run.ttfb ?? null)),
          totalTime: calcStat(successRuns.map((run) => run.totalTime ?? null)),
          cost: buildCostSummary(successRuns.map((run) => run.cost ?? null)),
        },
      };
    });
  }, [results]);

  const formatMs = (value: number | undefined | null) =>
    typeof value === 'number' ? `${Math.round(value)}ms` : '-';

  const formatCost = (value: number | undefined | null) =>
    typeof value === 'number' ? `$${value.toFixed(4)}` : '-';

  const generateHtmlReport = (params: {
    text: string;
    speed: number;
    batchCount: number;
    groupedResults: ProviderGroup[];
    summaryMetrics: {
      providerCount: number;
      successCount: number;
      failedCount: number;
      totalCost: number;
      hasEstimated: boolean;
    };
    audioBase64Map: Record<string, string>;
    formatMs: (value: number | undefined | null) => string;
    formatCost: (value: number | undefined | null) => string;
  }) => {
    const { text, speed, batchCount, groupedResults, summaryMetrics, audioBase64Map, formatMs, formatCost } = params;
    const generatedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TTS 测试报告 - ${generatedAt}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
      line-height: 1.6;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      color: #111827;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #111827;
    }
    h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #111827;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      margin-bottom: 2rem;
    }
    .meta {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .config-item {
      padding: 1rem;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .config-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .config-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .stat-item {
      padding: 1rem;
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 8px;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #92400e;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }
    .provider-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .provider-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }
    .provider-meta {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }
    .metrics-grid {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .metric-box {
      padding: 0.75rem 1rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      min-width: 220px;
    }
    .metric-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .metric-value {
      font-size: 0.875rem;
      color: #111827;
    }
    .details {
      margin-top: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .details-summary {
      padding: 0.75rem 1rem;
      background: #f9fafb;
      cursor: pointer;
      font-weight: 600;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .details-summary:hover {
      background: #f3f4f6;
    }
    .details-content {
      display: none;
    }
    details[open] .details-content {
      display: block;
    }
    .run-item {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .run-item:last-child {
      border-bottom: none;
    }
    .run-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
      min-width: 60px;
    }
    .audio-player {
      flex: 1;
      min-width: 300px;
    }
    audio {
      width: 100%;
      height: 40px;
    }
    .run-metrics {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6b7280;
      flex-wrap: wrap;
    }
    .run-metrics span {
      white-space: nowrap;
    }
    .run-metrics strong {
      color: #111827;
      font-weight: 600;
    }
    .error-item {
      padding: 1rem;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.875rem;
      font-weight: 500;
      border-bottom: 1px solid #fecaca;
    }
    .error-item:last-child {
      border-bottom: none;
    }
    .text-content {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      font-size: 0.875rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .play-all-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .play-all-btn:hover {
      background: #2563eb;
    }
    @media print {
      body {
        padding: 1rem;
      }
      .card {
        box-shadow: none;
        border: 1px solid #e5e7eb;
      }
      .play-all-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TTS 测试报告</h1>
      <div class="meta">生成时间: ${generatedAt}</div>
    </div>

    <div class="card">
      <h2>测试配置</h2>
      <div class="config-grid">
        <div class="config-item">
          <div class="config-label">测试文本</div>
          <div class="text-content">${text}</div>
        </div>
        <div class="config-item">
          <div class="config-label">字数</div>
          <div class="config-value">${text.length}</div>
        </div>
        <div class="config-item">
          <div class="config-label">语速</div>
          <div class="config-value">${speed.toFixed(1)}x</div>
        </div>
        <div class="config-item">
          <div class="config-label">批量次数</div>
          <div class="config-value">${batchCount}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>统计信息</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">供应商数</div>
          <div class="stat-value">${summaryMetrics.providerCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">成功次数</div>
          <div class="stat-value">${summaryMetrics.successCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">失败次数</div>
          <div class="stat-value">${summaryMetrics.failedCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">总成本</div>
          <div class="stat-value">$${summaryMetrics.totalCost.toFixed(4)}${summaryMetrics.hasEstimated ? ' (估算)' : ''}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>测试结果</h2>
      <button class="play-all-btn" onclick="playAllAudios()">▶️ 一键播放全部</button>
      ${groupedResults.map((group) => `
        <div class="provider-card">
          <div class="provider-header">
            <div>
              <div class="provider-name">${group.provider}</div>
              <div class="provider-meta">成功 ${group.successCount} 次 · 失败 ${group.failedCount} 次</div>
            </div>
            <div class="metrics-grid">
              <div class="metric-box">
                <div class="metric-label">首 Token</div>
                <div class="metric-value">
                  ${group.stats.ttfb ? `均值 ${formatMs(group.stats.ttfb.avg)} · 最快 ${formatMs(group.stats.ttfb.min)} · 最慢 ${formatMs(group.stats.ttfb.max)}` : '无成功数据'}
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">总耗时</div>
                <div class="metric-value">
                  ${group.stats.totalTime ? `均值 ${formatMs(group.stats.totalTime.avg)} · 最快 ${formatMs(group.stats.totalTime.min)} · 最慢 ${formatMs(group.stats.totalTime.max)}` : '无成功数据'}
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">成本</div>
                <div class="metric-value">
                  ${group.stats.cost ? `均值 ${formatCost(group.stats.cost.avg)} · 总计 ${formatCost(group.stats.cost.sum)}` : '无成功数据'}
                </div>
              </div>
            </div>
          </div>
          <details class="details">
            <summary class="details-summary">
              <span>查看明细（${group.runs.length} 次）</span>
              <span style="font-size: 0.875rem; color: #6b7280;">点击展开</span>
            </summary>
            <div class="details-content">
              ${group.runs.map((run, runIdx) => {
                const displayIndex = run.runIndex ?? runIdx + 1;
                if (run.status !== 'success') {
                  return `<div class="error-item">第 ${displayIndex} 次失败：${run.error || '合成失败'}</div>`;
                }
                const audioSrc = audioBase64Map[run.audioUrl] || run.audioUrl;
                return `
                  <div class="run-item">
                    <div class="run-label">第 ${displayIndex} 次</div>
                    <div class="audio-player">
                      <audio controls src="${audioSrc}" data-tts-audio="true"></audio>
                    </div>
                    <div class="run-metrics">
                      <span>首token: <strong>${run.ttfb != null ? `${run.ttfb}ms` : '-'}</strong></span>
                      <span>总耗时: <strong>${run.totalTime != null ? `${run.totalTime}ms` : '-'}</strong></span>
                      <span>成本: <strong>${typeof run.cost === 'number' ? `$${run.cost.toFixed(4)}` : '-'}</strong></span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </details>
        </div>
      `).join('')}
    </div>
  </div>

  <script>
    function playAllAudios() {
      const audios = document.querySelectorAll('audio[data-tts-audio="true"]');
      audios.forEach((audio, index) => {
        setTimeout(() => {
          audio.play();
        }, index * 3000);
      });
    }
  </script>
</body>
</html>`;
  };

  const summaryMetrics = useMemo(() => {
    const successRuns = results.filter(r => r.status === 'success');
    const failedCount = results.filter(r => r.status === 'failed').length;
    const totalCost = successRuns
      .filter(r => typeof r.cost === 'number')
      .reduce((sum, run) => sum + (run.cost || 0), 0);
    return {
      providerCount: groupedResults.length,
      successCount: successRuns.length,
      failedCount,
      totalCost,
      hasEstimated: results.some(r => r.pricing?.isEstimated),
    };
  }, [groupedResults, results]);

  const exportHtmlReport = async () => {
    if (results.length === 0) return;

    // 转换所有音频为 base64
    const audioBase64Map: Record<string, string> = {};
    for (const result of results) {
      if (result.status === 'success' && result.audioUrl) {
        try {
          const response = await fetch(result.audioUrl);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          audioBase64Map[result.audioUrl] = base64;
        } catch (error) {
          console.error('转换音频失败:', result.audioUrl, error);
        }
      }
    }

    // 生成 HTML 内容
    const html = generateHtmlReport({
      text: lastRunConfig?.text ?? text,
      speed: lastRunConfig?.speed ?? speed,
      batchCount: lastRunConfig?.batchCount ?? batchCount,
      groupedResults,
      summaryMetrics,
      audioBase64Map,
      formatMs,
      formatCost,
    });

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `tts_report_${ts}.html`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
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
                onClick={() => handleCompare({ batchCount: 1 })}
                disabled={!text.trim() || loading || providerVoices.filter(pv => pv.enabled).length === 0}
                showArrow={true}
              >
                {loading ? '合成中...' : '开始合成'}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-mutedForeground font-medium">批量次数</span>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="border-2 border-border rounded-lg px-3 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium text-sm"
                  disabled={loading}
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map(n => (
                    <option key={n} value={n}>
                      {n} 次
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => handleCompare({ batchCount })}
                  disabled={!text.trim() || loading || providerVoices.filter(pv => pv.enabled).length === 0 || batchCount < 1}
                  variant="secondary"
                  className="text-sm"
                >
                  批量生成
                </Button>
              </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                {/* 通用语速控制 */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                    通用语速: <span className="text-accent">{speed.toFixed(1)}x</span>
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
                  <p className="text-xs text-mutedForeground mt-2">
                    适用于除 Cartesia 外的所有供应商
                  </p>
                </div>

                {/* Cartesia专用语速控制 */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                    Cartesia 语速: <span className="text-accent">{cartesiaSpeed.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.1"
                    value={cartesiaSpeed}
                    onChange={(e) => setCartesiaSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-xs text-mutedForeground mt-2 font-medium">
                    <span>0.6x</span>
                    <span>1.5x</span>
                  </div>
                  <p className="text-xs text-mutedForeground mt-2">
                    Cartesia Sonic3 专用（官方限制范围）
                  </p>
                </div>

                {/* 语言选择 */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                    语言选择
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                    disabled={loading}
                  >
                    <option value="auto">自动识别</option>
                    <option value="zh">中文</option>
                    <option value="en">英语</option>
                    <option value="yue">粤语</option>
                  </select>
                  <p className="text-xs text-mutedForeground mt-2">
                    选择"自动识别"将测试模型的语言识别能力
                  </p>
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

                // 获取该Provider可用的TTS模型列表
                const getAvailableTtsModels = (): ModelDefinition[] => {
                  if (!provider.templateType) return [];
                  const template = templates[provider.templateType];
                  if (!template.models) return [];
                  return template.models.filter(m => m.type === 'tts');
                };

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

                  // 使用当前选中的模型ID（优先使用 pv.modelId，其次使用 provider.selectedModels?.tts）
                  const currentModelId = pv.modelId || provider.selectedModels?.tts;
                  const ttsModel = template.models.find(
                    m => m.type === 'tts' && m.id === currentModelId
                  );

                  return ttsModel?.voices || [];
                };

                const availableTtsModels = getAvailableTtsModels();
                const availableVoices = getAvailableVoices();
                const currentModelId = pv.modelId || provider.selectedModels?.tts;

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
                          </div>
                        </div>
                      </label>
                      {pv.enabled && (
                        <div className="flex-1 flex flex-row gap-3 min-w-[400px] flex-wrap">
                          {/* 模型选择 */}
                          {availableTtsModels.length > 0 && (
                            <div className="flex-1 min-w-[180px]">
                              <label className="block text-xs font-bold uppercase tracking-wide text-mutedForeground mb-2">
                                模型
                              </label>
                              <select
                                value={currentModelId}
                                onChange={(e) => updateProviderModel(provider.id, e.target.value)}
                                className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                              >
                                {availableTtsModels.map(model => (
                                  <option key={model.id} value={model.id}>
                                    {model.name} {model.description ? `- ${model.description}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* 音色选择 */}
                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-bold uppercase tracking-wide text-mutedForeground mb-2">
                              音色
                            </label>
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
        {loading && (() => {
          const enabledCount = providerVoices.filter(pv => pv.enabled).length;
          const totalTasks = enabledCount * batchCount;
          const total = ttsProgress?.total || totalTasks;
          const completed = ttsProgress?.completed || 0;
          const percentage = ttsProgress?.percentage || 0;
          const currentProvider = ttsProgress?.current?.provider;
          const currentRunIndex = ttsProgress?.current?.runIndex;
          return (
          <Card className="text-center" hover={false}>
              <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4"></div>
                <p className="text-mutedForeground font-medium mb-2">
                  正在调用各供应商 API 进行合成...
                </p>
                <p className="text-sm text-mutedForeground mb-4">
                  共 {enabledCount} 个供应商，每个生成 {batchCount} 次，总计 {totalTasks} 个任务
                </p>

                {ttsProgress && total > 0 ? (
                  <div className="w-full max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">执行进度</span>
                      <span className="text-sm text-gray-600">
                        {completed}/{total} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden border-2 border-border">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {(currentProvider || currentRunIndex) && (
                      <div className="text-xs text-mutedForeground mt-2">
                        当前：{currentProvider || '-'}
                        {currentRunIndex ? ` · 第${currentRunIndex}次` : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  // fallback：进度尚未拿到（例如刚启动任务）
                  <div className="w-full max-w-md mx-auto bg-muted rounded-full h-3 overflow-hidden border-2 border-border relative">
                    <div className="h-full bg-accent rounded-full absolute w-1/2 animate-progress-indeterminate" />
                  </div>
                )}
              </div>
          </Card>
          );
        })()}

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
                  onClick={exportHtmlReport}
                  variant="secondary"
                  className="text-sm"
                >
                  导出 HTML 报告
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
              {groupedResults.map((group, idx) => (
                <Card key={`${group.provider}-${idx}`} featured={false} hover={false} className="mb-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                    <h3 className="text-xl font-heading font-bold text-foreground">
                          {group.provider}
                    </h3>
                        <div className="mt-2 text-sm text-mutedForeground font-medium">
                          成功 {group.successCount} 次 · 失败 {group.failedCount} 次
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="px-3 py-2 bg-muted rounded-lg border border-border min-w-[220px]">
                          <div className="text-xs uppercase tracking-wide text-mutedForeground font-bold mb-1">
                            首 token
                          </div>
                          {group.stats.ttfb ? (
                            <div className="text-foreground text-sm">
                              均值 {formatMs(group.stats.ttfb.avg)} · 最快 {formatMs(group.stats.ttfb.min)} · 最慢 {formatMs(group.stats.ttfb.max)}
                            </div>
                          ) : (
                            <div className="text-mutedForeground text-sm">无成功数据</div>
                          )}
                        </div>
                        <div className="px-3 py-2 bg-muted rounded-lg border border-border min-w-[220px]">
                          <div className="text-xs uppercase tracking-wide text-mutedForeground font-bold mb-1">
                            总耗时
                          </div>
                          {group.stats.totalTime ? (
                            <div className="text-foreground text-sm">
                              均值 {formatMs(group.stats.totalTime.avg)} · 最快 {formatMs(group.stats.totalTime.min)} · 最慢 {formatMs(group.stats.totalTime.max)}
                            </div>
                          ) : (
                            <div className="text-mutedForeground text-sm">无成功数据</div>
                          )}
                        </div>
                        <div className="px-3 py-2 bg-muted rounded-lg border border-border min-w-[200px]">
                          <div className="text-xs uppercase tracking-wide text-mutedForeground font-bold mb-1">
                            成本
                          </div>
                          {group.stats.cost ? (
                            <div className="text-foreground text-sm">
                              均值 {formatCost(group.stats.cost.avg)} · 总计 {formatCost(group.stats.cost.sum)}
                            </div>
                          ) : (
                            <div className="text-mutedForeground text-sm">无成功数据</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <details className="rounded-lg border border-border bg-muted/30">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="font-heading font-bold text-foreground">
                          查看明细（{group.runs.length} 次）
                        </span>
                        <span className="text-sm text-mutedForeground">点击展开</span>
                      </summary>
                      <div className="divide-y divide-border">
                        {group.runs.map((run, runIdx) => {
                          const displayIndex = run.runIndex ?? runIdx + 1;
                          if (run.status !== 'success') {
                            return (
                              <div
                                key={`${group.provider}-failed-${runIdx}`}
                                className="p-4 bg-red-50 text-red-700 text-sm font-medium"
                              >
                                第 {displayIndex} 次失败：{run.error || '合成失败'}
                  </div>
                            );
                          }

                          return (
                            <div
                              key={`${group.provider}-success-${runIdx}`}
                              className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center"
                            >
                              <div className="flex-[3] min-w-0">
                                <div className="text-sm font-bold text-foreground mb-2">
                                  第 {displayIndex} 次
                                </div>
                                <div className="bg-white rounded-lg border border-border p-3">
                        <audio
                          controls
                                    src={run.audioUrl}
                          className="w-full"
                                    data-tts-audio="true"
                        />
                      </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end lg:items-start flex-shrink-0">
                                <div className="flex flex-row gap-3 text-xs text-mutedForeground">
                                  <span>首token: <span className="font-bold text-foreground">{run.ttfb != null ? `${run.ttfb}ms` : '-'}</span></span>
                                  <span>总耗时: <span className="font-bold text-foreground">{run.totalTime != null ? `${run.totalTime}ms` : '-'}</span></span>
                                  <span>成本: <span className="font-bold text-foreground">{typeof run.cost === 'number' ? `$${run.cost.toFixed(4)}` : '-'}</span></span>
                                </div>
                        <Button
                                onClick={() => handleMarkAsBadCaseSingle(run)}
                          variant="secondary"
                                className="text-sm flex-shrink-0 mt-2"
                        >
                          <Tag size={14} strokeWidth={2.5} className="mr-2" />
                          标记为 BadCase
                        </Button>
                              </div>
                      </div>
                          );
                        })}
                      </div>
                    </details>
                    </div>
                </Card>
              ))}
            </div>

            {/* 统计信息 */}
            <Card featured={false} hover={false} className="mt-6 bg-accent/10 border-accent">
              <h3 className="font-heading font-bold text-foreground mb-4">统计信息</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-mutedForeground">供应商数:</span>{' '}
                  <span className="font-bold text-foreground">{summaryMetrics.providerCount}</span>
                </div>
                <div>
                  <span className="text-mutedForeground">成功次数:</span>{' '}
                  <span className="font-bold text-quaternary">{summaryMetrics.successCount}</span>
                </div>
                <div>
                  <span className="text-mutedForeground">失败次数:</span>{' '}
                  <span className="font-bold text-red-600">{summaryMetrics.failedCount}</span>
                </div>
                <div>
                  <span className="text-mutedForeground">总成本:</span>{' '}
                  <span className="font-bold text-foreground">
                    ${summaryMetrics.totalCost.toFixed(4)}
                    {summaryMetrics.hasEstimated && (
                      <span className="text-xs text-yellow-600 ml-1" title="部分为估算值">(估算)</span>
                    )}
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
