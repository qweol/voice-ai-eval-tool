'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, Database } from 'lucide-react';
import { getConfig, getAllEnabledProvidersWithSystem } from '@/lib/utils/config';
import { GenericProviderConfig, ModelDefinition } from '@/lib/providers/generic/types';
import { templates } from '@/lib/providers/generic/templates';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SampleLibraryModal from '@/components/asr/SampleLibraryModal';
import { AsrSample } from '@/components/asr/SampleLibrary';
import JSZip from 'jszip';

interface ASRResult {
  provider: string;
  text: string;
  duration: number;
  status: string;
  error?: string;
  confidence?: number;
  providerId?: string;
  modelId?: string;
}

interface ProviderModel {
  providerId: string;
  modelId: string;
  enabled: boolean;
}

interface BatchASRResult {
  audioFile: string;
  audioUrl: string;
  audioSize: number;
  duration?: number;
  results: {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
    text: string;
    confidence?: number;
    duration: number;
    status: 'success' | 'error';
    error?: string;
  }[];
  expectedText?: string;
}

export default function ASRPage() {
  // 模式切换
  const [isBatchMode, setIsBatchMode] = useState(false);

  // 单文件模式状态
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ASRResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // 批量模式状态
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<BatchASRResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // 共用状态
  const [enabledProviders, setEnabledProviders] = useState<GenericProviderConfig[]>([]);
  const [language, setLanguage] = useState('zh');
  const [format, setFormat] = useState('wav');
  const [showSampleLibrary, setShowSampleLibrary] = useState(false);
  const [selectedSample, setSelectedSample] = useState<AsrSample | null>(null);
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);

  useEffect(() => {
    const config = getConfig();
    setLanguage(config.asr.defaultLanguage);
    setFormat(config.asr.defaultFormat);

    // 获取所有启用的提供者（包括系统预置）
    const loadProviders = async () => {
      const allProviders = await getAllEnabledProvidersWithSystem();

      // 筛选支持ASR的提供者
      const asrProviders = allProviders.filter((p) => {
        return p.serviceType === 'asr' || p.serviceType === 'both';
      });

      setEnabledProviders(asrProviders);

      // 初始化 providerModels
      const models = asrProviders.map((p) => {
        const defaultModelId = p.selectedModels?.asr || '';
        return {
          providerId: p.id,
          modelId: defaultModelId,
          enabled: true,
        };
      });
      setProviderModels(models);
    };

    loadProviders();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSelectedSample(null);
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
    }
  };

  // 处理样本选择
  const handleSelectSample = async (sample: AsrSample) => {
    setSelectedSample(sample);
    setFile(null);
    setAudioUrl(`/api/storage/audio/${sample.filename}`);
    setLanguage(sample.language);

    // 获取样本文件
    const audioRes = await fetch(`/api/storage/audio/${sample.filename}`);
    const audioBlob = await audioRes.blob();
    const audioFile = new File([audioBlob], sample.originalName, {
      type: `audio/${sample.format}`
    });
    setFile(audioFile);
  };

  // 处理 ZIP 文件上传
  const handleZipUpload = async (zipFile: File) => {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const audioFiles: File[] = [];

      // 遍历 ZIP 中的文件
      for (const [filename, file] of Object.entries(zip.files)) {
        // 跳过目录和隐藏文件
        if (file.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) {
          continue;
        }

        // 只处理音频文件
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac'].includes(ext || '')) {
          const blob = await file.async('blob');
          const audioFile = new File([blob], filename.split('/').pop() || filename, {
            type: `audio/${ext}`
          });
          audioFiles.push(audioFile);
        }
      }

      if (audioFiles.length === 0) {
        alert('ZIP 文件中没有找到音频文件');
        return;
      }

      setBatchFiles(audioFiles);
      console.log(`成功解析 ${audioFiles.length} 个音频文件`);
    } catch (error) {
      console.error('解析 ZIP 文件失败:', error);
      alert('解析 ZIP 文件失败，请检查文件格式');
    }
  };

  const updateProviderModel = (providerId: string, modelId: string) => {
    setProviderModels((prev) =>
      prev.map((pm) => {
        if (pm.providerId === providerId) {
          return { ...pm, modelId };
        }
        return pm;
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
              asr: modelId,
            },
          };
        }
        return p;
      })
    );
  };

  const toggleProvider = (providerId: string) => {
    setProviderModels((prev) =>
      prev.map((pm) => {
        if (pm.providerId === providerId) {
          return { ...pm, enabled: !pm.enabled };
        }
        return pm;
      })
    );
  };

  const handleCompare = async () => {
    if (!file) return;

    setLoading(true);
    setResults([]);

    try {
      // 使用 enabledProviders 状态，它包含了 UI 中更新的模型选择
      // 并根据 providerModels 的 enabled 状态过滤
      const selectedProviders = enabledProviders.filter((p) => {
        const pm = providerModels.find((m) => m.providerId === p.id);
        return pm?.enabled ?? true;
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      formData.append('format', format);
      formData.append('providers', JSON.stringify(selectedProviders));

      const res = await fetch('/api/asr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('识别失败');
      }

      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      console.error('Error:', error);
      alert('识别过程出错，请检查配置或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 为单个音频调用多个供应商
  const recognizeAudioWithProviders = async (
    audioFile: File,
    providers: GenericProviderConfig[]
  ) => {
    const results = [];

    for (const provider of providers) {
      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('language', language);
        formData.append('format', format);
        formData.append('providers', JSON.stringify([provider]));

        const res = await fetch('/api/asr', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        const result = data.results[0];

        // 获取模型名称
        const modelId = provider.selectedModels?.asr || '';
        const template = provider.templateType ? templates[provider.templateType] : null;
        const model = template?.models?.find(m => m.id === modelId);

        results.push({
          providerId: provider.id,
          providerName: provider.name,
          modelId: modelId,
          modelName: model?.name || modelId,
          text: result.text,
          confidence: result.confidence,
          duration: result.duration,
          status: 'success' as const,
        });
      } catch (error: any) {
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          modelId: provider.selectedModels?.asr || '',
          modelName: '',
          text: '',
          confidence: 0,
          duration: 0,
          status: 'error' as const,
          error: error.message,
        });
      }
    }

    return results;
  };

  // 批量识别函数
  const handleBatchRecognition = async () => {
    if (batchFiles.length === 0) {
      alert('请先上传 ZIP 文件');
      return;
    }

    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: batchFiles.length });

    const results: BatchASRResult[] = [];

    // 获取选中的供应商
    const selectedProviders = enabledProviders.filter((p) => {
      const pm = providerModels.find((m) => m.providerId === p.id);
      return pm?.enabled ?? true;
    });

    if (selectedProviders.length === 0) {
      alert('请至少选择一个供应商');
      setBatchLoading(false);
      return;
    }

    // 逐个处理音频文件
    for (let i = 0; i < batchFiles.length; i++) {
      const audioFile = batchFiles[i];

      console.log(`正在识别 ${i + 1}/${batchFiles.length}: ${audioFile.name}`);

      // 为当前音频调用所有选中的供应商
      const audioResults = await recognizeAudioWithProviders(audioFile, selectedProviders);

      results.push({
        audioFile: audioFile.name,
        audioUrl: URL.createObjectURL(audioFile),
        audioSize: audioFile.size,
        results: audioResults,
      });

      // 更新进度
      setBatchProgress({ current: i + 1, total: batchFiles.length });
      setBatchResults([...results]);
    }

    setBatchLoading(false);
    console.log('批量识别完成');
  };

  // 更新预期文本
  const updateExpectedText = (audioFile: string, expectedText: string) => {
    setBatchResults(prev =>
      prev.map(result =>
        result.audioFile === audioFile
          ? { ...result, expectedText }
          : result
      )
    );
  };

  // 标记为 BadCase
  const markAsBadCase = async (result: BatchASRResult, providerResult: any) => {
    try {
      const badCase = {
        type: 'asr',
        providerId: providerResult.providerId,
        providerName: providerResult.providerName,
        modelId: providerResult.modelId,
        input: {
          audioFile: result.audioFile,
          language: language,
        },
        output: {
          text: providerResult.text,
          confidence: providerResult.confidence,
        },
        expectedOutput: result.expectedText || '',
        issue: '识别结果不准确',
        severity: 'medium',
        status: 'open',
      };

      const res = await fetch('/api/badcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badCase),
      });

      if (res.ok) {
        alert('已成功标记为 BadCase');
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('标记 BadCase 失败:', error);
      alert('标记 BadCase 失败，请重试');
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
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-5xl font-heading font-extrabold text-foreground">
              ASR 语音识别对比
            </h1>
            {/* 模式切换 */}
            <div className="flex items-center gap-3 bg-white border-2 border-border rounded-full p-1 shadow-sm">
              <button
                onClick={() => setIsBatchMode(false)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                  !isBatchMode
                    ? 'bg-accent text-accentForeground shadow-pop'
                    : 'text-mutedForeground hover:text-foreground'
                }`}
              >
                单个文件
              </button>
              <button
                onClick={() => setIsBatchMode(true)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                  isBatchMode
                    ? 'bg-accent text-accentForeground shadow-pop'
                    : 'text-mutedForeground hover:text-foreground'
                }`}
              >
                批量测试
              </button>
            </div>
          </div>
          <p className="text-xl text-mutedForeground">
            {isBatchMode
              ? '上传 ZIP 文件，批量测试多个音频的识别效果'
              : '上传音频文件，对比多个供应商的识别效果'}
          </p>
        </div>

        {/* 文件上传区域 */}
        <Card className="mb-8" hover={false}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-heading font-bold">
                {isBatchMode ? '上传音频文件（批量）' : '上传音频文件'}
              </h2>
              {!isBatchMode && (
                <Button
                  onClick={() => setShowSampleLibrary(true)}
                  showArrow={false}
                >
                  <Database size={18} className="mr-2" />
                  样本库
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
          {!isBatchMode ? (
            // 单文件模式
            <>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-mutedForeground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-2 file:border-foreground
                    file:text-sm file:font-bold
                    file:bg-accent file:text-accentForeground
                    hover:file:bg-accent/90 file:shadow-pop file:cursor-pointer"
                />
              </div>

              {file && (
                <div className="mb-4 p-4 bg-muted rounded-lg border-2 border-border">
                  <p className="text-sm text-mutedForeground mb-2">
                    已选择: <span className="font-bold text-foreground">{file.name}</span>
                    <span className="ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </p>
                  {audioUrl && (
                    <audio controls src={audioUrl} className="w-full mt-2" />
                  )}
                </div>
              )}
            </>
          ) : (
            // 批量模式
            <>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const zipFile = e.target.files?.[0];
                    if (zipFile) {
                      handleZipUpload(zipFile);
                    }
                  }}
                  className="block w-full text-sm text-mutedForeground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-2 file:border-foreground
                    file:text-sm file:font-bold
                    file:bg-accent file:text-accentForeground
                    hover:file:bg-accent/90 file:shadow-pop file:cursor-pointer"
                />
              </div>

              {batchFiles.length > 0 && (
                <div className="mb-4 p-4 bg-muted rounded-lg border-2 border-border">
                  <p className="text-sm font-bold text-foreground mb-3">
                    已选择: {batchFiles.length} 个音频文件
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {batchFiles.slice(0, 10).map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs text-mutedForeground">
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ))}
                    {batchFiles.length > 10 && (
                      <p className="text-xs text-mutedForeground italic">
                        ... 还有 {batchFiles.length - 10} 个文件
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 识别参数 */}
            <div className="border-t-2 border-border pt-6 mb-6">
              <h3 className="text-xl font-heading font-bold mb-4">识别参数</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="zh-en">中英文混合</option>
                </select>
              </div>
              <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  音频格式
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                    className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                >
                  <option value="wav">WAV</option>
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A</option>
                </select>
              </div>
            </div>
          </div>

          {/* 供应商选择 */}
            <div className="border-t-2 border-border pt-6 mb-6">
              <h3 className="text-xl font-heading font-bold mb-4">选择供应商</h3>
              <div className="space-y-3">
              {enabledProviders.map((provider) => {
                const pm = providerModels.find((p) => p.providerId === provider.id);
                const isEnabled = pm?.enabled ?? true;

                // 获取可用的 ASR 模型
                const getAvailableAsrModels = (): ModelDefinition[] => {
                  if (!provider.templateType) return [];
                  const template = templates[provider.templateType];
                  if (!template.models) return [];
                  return template.models.filter(m => m.type === 'asr');
                };

                const availableAsrModels = getAvailableAsrModels();
                const currentModelId = pm?.modelId || provider.selectedModels?.asr;

                return (
                    <Card key={provider.id} featured={false} hover={false} className="mb-2">
                    <div className="flex items-start gap-3">
                      <label className="flex items-center cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleProvider(provider.id)}
                          className="w-5 h-5 rounded border-2 border-foreground accent-accent cursor-pointer"
                    />
                  </label>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-foreground">{provider.name}</span>
                        <span className="text-xs px-2 py-1 bg-accent text-accentForeground rounded-full font-bold">
                          {provider.templateType || 'custom'}
                        </span>
                        </div>
                        {isEnabled && availableAsrModels.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-xs font-bold uppercase tracking-wide text-mutedForeground mb-1">
                              模型
                            </label>
                            <select
                              value={currentModelId}
                              onChange={(e) => updateProviderModel(provider.id, e.target.value)}
                              className="w-full border-2 border-border rounded-lg px-3 py-1.5 bg-input text-foreground text-sm focus:outline-none focus:border-accent transition-all"
                            >
                              {availableAsrModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
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

            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={isBatchMode ? handleBatchRecognition : handleCompare}
                disabled={
                  isBatchMode
                    ? batchFiles.length === 0 || batchLoading || enabledProviders.length === 0
                    : !file || loading || enabledProviders.length === 0
                }
                showArrow={true}
              >
                {isBatchMode
                  ? batchLoading ? '批量识别中...' : '开始批量识别'
                  : loading ? '识别中...' : '开始识别'}
              </Button>
          {enabledProviders.length === 0 && (
            <Link
              href="/settings"
                  className="text-sm text-accent hover:text-accent/80 font-bold underline"
            >
              请先配置API密钥
            </Link>
          )}
        </div>
          </CardContent>
        </Card>

        {/* 加载状态 */}
        {loading && !isBatchMode && (
          <Card className="text-center" hover={false}>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4"></div>
            <p className="text-mutedForeground font-medium">正在调用各供应商 API 进行识别...</p>
          </Card>
        )}

        {/* 批量识别进度 */}
        {batchLoading && (
          <Card hover={false}>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">批量识别进度</h3>
                  <span className="text-sm font-bold text-accent">
                    {batchProgress.current} / {batchProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-mutedForeground text-center">
                  正在识别音频文件...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 单文件结果展示 */}
        {results.length > 0 && !loading && !isBatchMode && (
          <Card hover={false}>
            <h2 className="text-2xl font-heading font-bold mb-6">识别结果对比</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border-2 border-border px-4 py-3 text-left font-heading font-bold text-foreground">
                      供应商
                    </th>
                    <th className="border-2 border-border px-4 py-3 text-left font-heading font-bold text-foreground">
                      识别文本
                    </th>
                    <th className="border-2 border-border px-4 py-3 text-left font-heading font-bold text-foreground">
                      耗时(秒)
                    </th>
                    <th className="border-2 border-border px-4 py-3 text-left font-heading font-bold text-foreground">
                      置信度
                    </th>
                    <th className="border-2 border-border px-4 py-3 text-left font-heading font-bold text-foreground">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="border-2 border-border px-4 py-3 font-bold text-foreground">
                        {result.provider}
                      </td>
                      <td className="border-2 border-border px-4 py-3">
                        {result.status === 'success' ? (
                          <span className="text-foreground">{result.text}</span>
                        ) : (
                          <span className="text-red-600 font-medium">{result.error || '识别失败'}</span>
                        )}
                      </td>
                      <td className="border-2 border-border px-4 py-3 text-mutedForeground font-medium">
                        {result.duration.toFixed(2)}
                      </td>
                      <td className="border-2 border-border px-4 py-3 text-mutedForeground font-medium">
                        {result.status === 'success' && result.confidence !== undefined ? (
                          <span className="text-foreground font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-mutedForeground">-</span>
                        )}
                      </td>
                      <td className="border-2 border-border px-4 py-3">
                        {result.status === 'success' ? (
                          <span className="px-3 py-1 bg-quaternary text-white rounded-full font-bold text-sm">✓ 成功</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full font-bold text-sm">✗ 失败</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 文本对比 */}
            <div className="mt-6">
              <h3 className="text-xl font-heading font-bold mb-4">文本对比</h3>
              <div className="space-y-3">
                {results
                  .filter(r => r.status === 'success')
                  .map((result, i) => (
                    <Card key={i} featured={false} hover={false} className="mb-2">
                      <span className="font-bold text-accent">{result.provider}:</span>{' '}
                      <span className="text-foreground">{result.text}</span>
                    </Card>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* 批量结果展示 - 按音频分组 */}
        {batchResults.length > 0 && !batchLoading && isBatchMode && (
          <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold">批量识别结果</h2>

            {batchResults.map((result, index) => (
              <Card key={index} hover={false}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">
                      📁 {result.audioFile}
                    </h3>
                    <span className="text-sm text-mutedForeground">
                      {(result.audioSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 音频播放器 */}
                  <div className="mb-4">
                    <audio controls src={result.audioUrl} className="w-full" />
                  </div>

                  {/* 各供应商识别结果 */}
                  <div className="space-y-3">
                    {result.results.map((providerResult, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 ${
                          providerResult.status === 'success'
                            ? 'border-border bg-muted'
                            : 'border-red-300 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-bold text-foreground">
                              {providerResult.status === 'success' ? '✓' : '✗'}{' '}
                              {providerResult.providerName}
                            </span>
                            {providerResult.modelName && (
                              <span className="ml-2 text-xs px-2 py-1 bg-accent text-accentForeground rounded-full">
                                {providerResult.modelName}
                              </span>
                            )}
                          </div>
                          {providerResult.status === 'success' && (
                            <div className="text-xs text-mutedForeground">
                              耗时: {providerResult.duration.toFixed(2)}s
                              {providerResult.confidence && (
                                <> | 置信度: {(providerResult.confidence * 100).toFixed(0)}%</>
                              )}
                            </div>
                          )}
                        </div>

                        {providerResult.status === 'success' ? (
                          <p className="text-foreground">{providerResult.text}</p>
                        ) : (
                          <p className="text-red-600">识别失败: {providerResult.error}</p>
                        )}

                        {/* BadCase 标注按钮 */}
                        {providerResult.status === 'success' && (
                          <div className="mt-2">
                            <button
                              onClick={() => markAsBadCase(result, providerResult)}
                              className="text-xs px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              标记为 BadCase
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 预期文本输入 */}
                  <div className="mt-4 pt-4 border-t-2 border-border">
                    <label className="block text-sm font-bold text-foreground mb-2">
                      预期文本（可选）
                    </label>
                    <input
                      type="text"
                      value={result.expectedText || ''}
                      onChange={(e) => updateExpectedText(result.audioFile, e.target.value)}
                      placeholder="输入预期的识别文本..."
                      className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 样本库模态框 */}
      <SampleLibraryModal
        isOpen={showSampleLibrary}
        onClose={() => setShowSampleLibrary(false)}
        onSelectSample={handleSelectSample}
      />
    </div>
  );
}
