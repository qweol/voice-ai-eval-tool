'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { getConfig, saveConfig, resetConfig, getAllProvidersWithSystem, type AppConfig } from '@/lib/utils/config';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import CherryStyleProviderManager from './CherryStyleProviderManager';
import TemplateManager from './TemplateManager';
import ModelPlaza from './ModelPlaza';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
        <div className="text-mutedForeground font-medium">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      
      <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4 font-bold transition-colors">
            <ArrowLeft size={18} strokeWidth={2.5} />
            返回首页
          </Link>
          <h1 className="text-5xl font-heading font-extrabold text-foreground mb-3">设置</h1>
          <p className="text-xl text-mutedForeground">配置API密钥和偏好设置</p>
        </div>

        {/* 保存提示 */}
        {saved && (
          <Card featured={false} hover={false} className="mb-6 bg-quaternary/10 border-quaternary">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={2.5} className="text-quaternary" />
              <span className="font-bold text-foreground">配置已保存</span>
            </div>
          </Card>
        )}

        {error && (
          <Card featured={false} hover={false} className="mb-6 bg-red-50 border-red-500">
            <div className="flex items-center gap-3">
              <XCircle size={20} strokeWidth={2.5} className="text-red-600" />
              <span className="font-bold text-red-600">{error}</span>
            </div>
          </Card>
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
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-heading font-bold">TTS 默认设置</h2>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                  默认语速: <span className="text-accent">{config.tts.defaultSpeed.toFixed(1)}x</span>
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
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-xs text-mutedForeground mt-2 font-medium">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ASR 默认设置 */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-heading font-bold">ASR 默认设置</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  默认语言
                </label>
                <select
                  value={config.asr.defaultLanguage}
                  onChange={(e) =>
                    setConfig({ ...config, asr: { ...config.asr, defaultLanguage: e.target.value } })
                  }
                  className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="zh-en">中英文混合</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
                  默认格式
                </label>
                <select
                  value={config.asr.defaultFormat}
                  onChange={(e) =>
                    setConfig({ ...config, asr: { ...config.asr, defaultFormat: e.target.value } })
                  }
                  className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent focus:shadow-pop transition-all duration-300 font-medium"
                >
                  <option value="wav">WAV</option>
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex gap-4 mb-6">
          <Button onClick={handleSave} showArrow={false}>
            保存配置
          </Button>
          <Button onClick={handleReset} variant="secondary" showArrow={false}>
            重置为默认值
          </Button>
        </div>

        {/* 提示信息 */}
        <Card featured={false} hover={false} className="bg-tertiary/10 border-tertiary">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} strokeWidth={2.5} className="text-tertiary mt-0.5" />
            <div>
              <h3 className="font-heading font-bold text-foreground mb-2">安全提示</h3>
              <ul className="text-sm text-mutedForeground space-y-1 list-disc list-inside">
                <li>API密钥仅存储在浏览器本地（localStorage），不会上传到服务器</li>
                <li>请妥善保管你的API密钥，不要分享给他人</li>
                <li>建议定期更换API密钥以提高安全性</li>
                <li>清除浏览器数据会删除所有已保存的配置</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
