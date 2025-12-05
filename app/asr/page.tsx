'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ASRResult {
  provider: string;
  text: string;
  duration: number;
  status: string;
  error?: string;
}

export default function ASRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ASRResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // 创建本地预览 URL
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
    }
  };

  const handleCompare = async () => {
    if (!file) return;

    setLoading(true);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

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

          <button
            onClick={handleCompare}
            disabled={!file || loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold
              hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors"
          >
            {loading ? '识别中...' : '开始识别'}
          </button>
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
