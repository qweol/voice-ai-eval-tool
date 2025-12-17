'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getConfig, saveConfig, resetConfig, getAllProvidersWithSystem, type AppConfig } from '@/lib/utils/config';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import CherryStyleProviderManager from './CherryStyleProviderManager';
import TemplateManager from './TemplateManager';
import ModelPlaza from './ModelPlaza';

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [allProviders, setAllProviders] = useState<GenericProviderConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setConfig(getConfig());
    loadAllProviders();
  }, []);

  const loadAllProviders = async () => {
    try {
      const providers = await getAllProvidersWithSystem();
      setAllProviders(providers);
    } catch (error) {
      console.error('加载供应商失败:', error);
      // 如果加载失败，只显示用户自定义供应商
      setAllProviders(getConfig().providers);
    }
  };

  const handleSave = () => {
    if (!config) return;

    try {
      saveConfig(config);
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || '保存失败');
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有配置吗？这将清除所有已保存的API密钥。')) {
      resetConfig();
      setConfig(getConfig());
      loadAllProviders(); // 重新加载供应商列表
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleProviderUpdate = () => {
    setConfig(getConfig());
    loadAllProviders(); // 重新加载供应商列表
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">设置</h1>
          <p className="text-gray-600">配置API密钥和偏好设置</p>
        </div>

        {/* 保存提示 */}
        {saved && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✓ 配置已保存
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            ✗ {error}
          </div>
        )}

        {/* 模型服务管理 - Cherry Studio风格 */}
        <CherryStyleProviderManager
          providers={allProviders}
          onUpdate={handleProviderUpdate}
        />

        {/* 模型广场 */}
        <div className="mt-6">
          <ModelPlaza providers={allProviders} />
        </div>

        {/* 模板管理 */}
        <div className="mt-6">
          <TemplateManager />
        </div>

        {/* TTS 默认设置 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">TTS 默认设置</h2>
          <div className="max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认语速: {config.tts.defaultSpeed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.tts.defaultSpeed}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    tts: { ...config.tts, defaultSpeed: parseFloat(e.target.value) },
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>
          </div>
        </div>

        {/* ASR 默认设置 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">ASR 默认设置</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认语言
              </label>
              <select
                value={config.asr.defaultLanguage}
                onChange={(e) =>
                  setConfig({ ...config, asr: { ...config.asr, defaultLanguage: e.target.value } })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="zh">中文</option>
                <option value="en">英文</option>
                <option value="zh-en">中英文混合</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认格式
              </label>
              <select
                value={config.asr.defaultFormat}
                onChange={(e) =>
                  setConfig({ ...config, asr: { ...config.asr, defaultFormat: e.target.value } })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
                <option value="m4a">M4A</option>
              </select>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            保存配置
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            重置为默认值
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 安全提示</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>API密钥仅存储在浏览器本地（localStorage），不会上传到服务器</li>
            <li>请妥善保管你的API密钥，不要分享给他人</li>
            <li>建议定期更换API密钥以提高安全性</li>
            <li>清除浏览器数据会删除所有已保存的配置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
