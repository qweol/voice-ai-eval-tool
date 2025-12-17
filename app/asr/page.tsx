'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getConfig, getAllEnabledProvidersWithSystem } from '@/lib/utils/config';
import { GenericProviderConfig } from '@/lib/providers/generic/types';

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
      // 创建本地预览 URL
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ASR 语音识别对比
          </h1>
          <p className="text-gray-600">
            上传音频文件，对比多个供应商的识别效果
          </p>
        </div>

        {/* 文件上传区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">上传音频文件</h2>

          <div className="flex items-center gap-4 mb-4">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                已选择: <span className="font-semibold">{file.name}</span>
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              {audioUrl && (
                <audio controls src={audioUrl} className="w-full mt-2" />
              )}
            </div>
          )}

          {/* 识别参数 */}
          <div className="border-t pt-4 mb-4">
            <h3 className="text-lg font-semibold mb-4">识别参数</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="zh-en">中英文混合</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  音频格式
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wav">WAV</option>
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A</option>
                </select>
              </div>
            </div>
          </div>

          {/* 供应商选择 */}
          <div className="border-t pt-4 mb-4">
            <h3 className="text-lg font-semibold mb-4">选择供应商</h3>
            <div className="space-y-2">
              {enabledProviders.map((provider) => {
                return (
                  <label key={provider.id} className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleProvider(provider.id)}
                      className="mr-2"
                    />
                    <span className="font-medium">{provider.name}</span>
                    <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {provider.templateType || 'custom'}
                    </span>
                  </label>
                );
              })}
            </div>
            {enabledProviders.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                提示：请先在设置页面配置API密钥并启用供应商
              </p>
            )}
          </div>

          <button
            onClick={handleCompare}
            disabled={!file || loading || enabledProviders.length === 0}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold
              hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors"
          >
            {loading ? '识别中...' : '开始识别'}
          </button>
          {enabledProviders.length === 0 && (
            <Link
              href="/settings"
              className="ml-4 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              请先配置API密钥
            </Link>
          )}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">正在调用各供应商 API 进行识别...</p>
          </div>
        )}

        {/* 结果展示 */}
        {results.length > 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">识别结果对比</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      供应商
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      识别文本
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      耗时(秒)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      置信度
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">
                        {result.provider}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {result.status === 'success' ? (
                          <span className="text-gray-800">{result.text}</span>
                        ) : (
                          <span className="text-red-500">{result.error || '识别失败'}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {result.duration.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {result.status === 'success' && result.confidence !== undefined ? (
                          <span className="text-gray-600">{(result.confidence * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {result.status === 'success' ? (
                          <span className="text-green-600 font-semibold">✓ 成功</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ 失败</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 文本对比 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">文本对比</h3>
              <div className="space-y-2">
                {results
                  .filter(r => r.status === 'success')
                  .map((result, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded">
                      <span className="font-semibold text-gray-700">{result.provider}:</span>{' '}
                      <span className="text-gray-800">{result.text}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
