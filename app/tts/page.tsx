'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TTSResult {
  provider: string;
  audioUrl: string;
  duration: number;
  status: string;
  error?: string;
}

export default function TTSPage() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<TTSResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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

          <div className="flex items-center gap-4">
            <button
              onClick={handleCompare}
              disabled={!text.trim() || loading}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold
                hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors"
            >
              {loading ? '合成中...' : '开始合成'}
            </button>

            <div className="text-sm text-gray-500">
              字数: {text.length}
            </div>
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
              <button
                onClick={playAll}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold
                  hover:bg-green-700 transition-colors"
              >
                🔊 一键播放全部
              </button>
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
                    <div className="bg-gray-50 rounded p-3">
                      <audio
                        id={`audio-${i}`}
                        controls
                        src={result.audioUrl}
                        className="w-full"
                      />
                    </div>
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
