import Link from 'next/link';
import { Mic, Volume2, BarChart3, FileText, Settings, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 py-24 relative z-10">
        {/* Hero区域 */}
        <div className="text-center mb-20">
          <h1 className="text-6xl md:text-7xl font-heading font-extrabold text-foreground mb-6">
            语音服务对比工具
          </h1>
          <p className="text-2xl text-mutedForeground font-body max-w-2xl mx-auto">
            快速对比多个供应商的 TTS 和 ASR 效果
          </p>
        </div>

        {/* 主要功能区 - ASR 和 TTS */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          <Link href="/asr" className="block">
            <Card featured={false} className="h-full cursor-pointer">
              <CardHeader 
                icon={<Mic size={24} strokeWidth={2.5} />}
                badge={
                  <span className="inline-block px-3 py-1 bg-accent text-accentForeground text-xs font-bold rounded-full">
                    核心功能
                  </span>
                }
              >
                ASR 语音识别
              </CardHeader>
              <CardContent className="text-lg mb-6">
                上传音频文件，对比多个供应商的识别效果
              </CardContent>
              <div className="flex items-center text-accent font-bold text-lg">
                开始对比
                <ArrowRight size={20} strokeWidth={2.5} className="ml-2" />
              </div>
            </Card>
          </Link>

          <Link href="/tts" className="block">
            <Card featured={false} className="h-full cursor-pointer">
              <CardHeader 
                icon={<Volume2 size={24} strokeWidth={2.5} />}
                badge={
                  <span className="inline-block px-3 py-1 bg-secondary text-white text-xs font-bold rounded-full">
                    核心功能
                  </span>
                }
              >
                TTS 语音合成
              </CardHeader>
              <CardContent className="text-lg mb-6">
                输入文本，对比多个供应商的合成效果
              </CardContent>
              <div className="flex items-center text-secondary font-bold text-lg">
                开始对比
                <ArrowRight size={20} strokeWidth={2.5} className="ml-2" />
              </div>
            </Card>
          </Link>
        </div>

        {/* 辅助功能区 - 批量测试和 BadCase 管理 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-8">
          <Link href="/batch-test" className="block">
            <Card featured={false} className="cursor-pointer">
              <CardHeader 
                icon={<BarChart3 size={20} strokeWidth={2.5} />}
                badge={
                  <span className="inline-block px-2 py-1 bg-quaternary text-white text-xs font-bold rounded-full">
                    高级功能
                  </span>
                }
              >
                <h3 className="text-xl font-heading font-bold">批量测试</h3>
              </CardHeader>
              <CardContent className="text-sm mb-3">
                系统性测试和历史对比分析
              </CardContent>
              <div className="text-quaternary font-bold text-sm flex items-center">
                开始测试
                <ArrowRight size={16} strokeWidth={2.5} className="ml-1" />
              </div>
            </Card>
          </Link>

          <Link href="/badcases" className="block">
            <Card featured={false} className="cursor-pointer">
              <CardHeader 
                icon={<FileText size={20} strokeWidth={2.5} />}
                badge={
                  <span className="inline-block px-2 py-1 bg-tertiary text-foreground text-xs font-bold rounded-full">
                    管理工具
                  </span>
                }
              >
                <h3 className="text-xl font-heading font-bold">BadCase 管理</h3>
              </CardHeader>
              <CardContent className="text-sm mb-3">
                管理和追踪测试中发现的问题用例
              </CardContent>
              <div className="text-tertiary font-bold text-sm flex items-center">
                查看管理
                <ArrowRight size={16} strokeWidth={2.5} className="ml-1" />
              </div>
            </Card>
          </Link>
        </div>

        {/* 设置入口 */}
        <div className="max-w-6xl mx-auto mb-16">
          <Link href="/settings">
            <Card featured={false} className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-foreground">
                    <Settings size={24} strokeWidth={2.5} className="text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-foreground mb-1">设置</h3>
                    <p className="text-mutedForeground">
                      配置API密钥、音色参数和默认设置
                    </p>
                  </div>
                </div>
                <ArrowRight size={24} strokeWidth={2.5} className="text-mutedForeground" />
              </div>
            </Card>
          </Link>
        </div>

        {/* 底部提示 */}
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-mutedForeground mb-6 text-lg">
            支持OpenAI、Qwen、豆包等大模型API，也可自定义接入任意兼容的API
          </p>
          <Link href="/settings">
            <Button variant="secondary" showArrow={false}>
              <Settings size={18} strokeWidth={2.5} className="mr-2" />
              前往设置页面配置API
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
