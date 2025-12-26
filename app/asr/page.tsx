'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, Database } from 'lucide-react';
import { getConfig, getAllEnabledProvidersWithSystem } from '@/lib/utils/config';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SampleLibraryModal from '@/components/asr/SampleLibraryModal';
import { AsrSample } from '@/components/asr/SampleLibrary';

interface ASRResult {
  provider: string;
  text: string;
  duration: number;
  status: string;
  error?: string;
  confidence?: number;
}

export default function ASRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ASRResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [enabledProviders, setEnabledProviders] = useState<GenericProviderConfig[]>([]);
  const [language, setLanguage] = useState('zh');
  const [format, setFormat] = useState('wav');
  const [showSampleLibrary, setShowSampleLibrary] = useState(false);
  const [selectedSample, setSelectedSample] = useState<AsrSample | null>(null);

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

  const toggleProvider = (providerId: string) => {
    setEnabledProviders((prev) => {
      const filtered = prev.filter((p) => p.id !== providerId);
      // 如果过滤后数量没变，说明是要移除，否则是要添加（但这里我们只处理移除）
      return filtered.length < prev.length ? filtered : prev;
    });
  };

  const handleCompare = async () => {
    if (!file) return;

    setLoading(true);
    setResults([]);

    try {
      // 获取所有启用的供应商（包括系统预置）
      const allProviders = await getAllEnabledProvidersWithSystem();
      const providers = allProviders.filter(
        (p) => p.serviceType === 'asr' || p.serviceType === 'both'
      );

      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      formData.append('format', format);
      formData.append('providers', JSON.stringify(providers));

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
            ASR 语音识别对比
          </h1>
          <p className="text-xl text-mutedForeground">
            上传音频文件，对比多个供应商的识别效果
          </p>
        </div>

        {/* 文件上传区域 */}
        <Card className="mb-8" hover={false}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-heading font-bold">上传音频文件</h2>
              <Button
                onClick={() => setShowSampleLibrary(true)}
                showArrow={false}
              >
                <Database size={18} className="mr-2" />
                样本库
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                return (
                    <Card key={provider.id} featured={false} hover={false} className="mb-2">
                      <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleProvider(provider.id)}
                          className="w-5 h-5 rounded border-2 border-foreground accent-accent cursor-pointer mr-3"
                    />
                        <span className="font-bold text-foreground">{provider.name}</span>
                        <span className="ml-3 text-xs px-2 py-1 bg-accent text-accentForeground rounded-full font-bold">
                      {provider.templateType || 'custom'}
                    </span>
                  </label>
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
            onClick={handleCompare}
            disabled={!file || loading || enabledProviders.length === 0}
                showArrow={true}
          >
            {loading ? '识别中...' : '开始识别'}
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
        {loading && (
          <Card className="text-center" hover={false}>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4"></div>
            <p className="text-mutedForeground font-medium">正在调用各供应商 API 进行识别...</p>
          </Card>
        )}

        {/* 结果展示 */}
        {results.length > 0 && !loading && (
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
