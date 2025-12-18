import { NextRequest, NextResponse } from 'next/server';
import { callGenericTTS } from '@/lib/providers/generic/caller';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { TTSOptions } from '@/lib/types';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import { getSystemProviders } from '@/lib/providers/system-providers';

interface ProviderVoice {
  providerId: string;
  voice: string;
  enabled: boolean;
}

interface RequestBody {
  text: string;
  options?: TTSOptions;
  providerVoices?: ProviderVoice[];
  providers?: GenericProviderConfig[]; // API配置
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { text, options, providerVoices, providers } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '文本不能为空' },
        { status: 400 }
      );
    }

    console.log(`收到 TTS 请求，文本长度: ${text.length}`);

    // 确保音频目录存在（可通过环境变量配置）
    const audioDir =
      process.env.AUDIO_STORAGE_DIR ||
      path.join(process.cwd(), 'public', 'audio');
    try {
      await mkdir(audioDir, { recursive: true });
    } catch (error) {
      // 目录已存在，忽略错误
    }

    // 获取启用的提供者
    const enabledProviderVoices = providerVoices?.filter((pv) => pv.enabled) || [];
    const allProviders = providers || [];

    console.log('=== TTS API 开始处理 ===');

    // 获取系统预置供应商（包含完整 API Key）
    const systemProviders = getSystemProviders();
    console.log('系统预置供应商数量:', systemProviders.length);
    console.log('QWEN_API_KEY 环境变量:', process.env.QWEN_API_KEY ? '已设置' : '未设置');
    console.log('CARTESIA_API_KEY 环境变量:', process.env.CARTESIA_API_KEY ? '已设置' : '未设置');
    console.log('OPENAI_API_KEY 环境变量:', process.env.OPENAI_API_KEY ? '已设置' : '未设置');
    systemProviders.forEach(sp => {
      console.log(`  - ${sp.name} (${sp.id}): API Key 长度 = ${sp.apiKey?.length || 0}`);
    });

    // 合并供应商配置：如果是系统预置供应商，使用服务器端的完整配置
    const mergedProviders = allProviders.map(provider => {
      if (provider.isSystem) {
        console.log('处理系统预置供应商:', provider.name, 'ID:', provider.id);
        // 从系统预置供应商中查找完整配置
        const systemProvider = systemProviders.find(sp => sp.id === provider.id);
        if (systemProvider) {
          console.log('找到系统配置，API Key 长度:', systemProvider.apiKey?.length);

          // 只允许覆盖以下用户可配置的字段，其他关键配置保持系统预置的值
          const allowedOverrides = {
            selectedModels: provider.selectedModels,
            selectedVoice: provider.selectedVoice,
            customModels: provider.customModels,
            enabled: provider.enabled,
          };

          // 过滤掉 undefined 的值
          const validOverrides = Object.fromEntries(
            Object.entries(allowedOverrides).filter(([_, v]) => v !== undefined)
          );

          return {
            ...systemProvider,
            ...validOverrides,
            apiKey: systemProvider.apiKey, // 确保使用系统的 API Key
          };
        } else {
          console.error('未找到系统预置供应商:', provider.id);
        }
      }
      return provider;
    });

    // 筛选支持TTS的提供者
    const ttsProviders = mergedProviders.filter(
      (p) => p.serviceType === 'tts' || p.serviceType === 'both'
    );

    // 根据前端选择的启用状态过滤供应商
    // 只处理在 enabledProviderVoices 中存在且 enabled 为 true 的供应商
    const enabledProviderIds = new Set(enabledProviderVoices.map(pv => pv.providerId));
    const filteredTtsProviders = ttsProviders.filter(
      (provider) => enabledProviderIds.has(provider.id)
    );

    console.log(`启用的供应商数量: ${filteredTtsProviders.length} / ${ttsProviders.length}`);

    // 构建提供者调用列表
    const providerCalls = filteredTtsProviders.map((provider) => {
      const providerVoice = enabledProviderVoices.find((pv) => pv.providerId === provider.id);
      const voice = providerVoice?.voice || options?.voice || 'default';
      
      const ttsOptions: TTSOptions = {
        voice,
        speed: options?.speed,
      };

      return {
        name: provider.name,
        id: provider.id,
        fn: () => callGenericTTS(provider, text, ttsOptions),
      };
    });

    // 使用 Promise.allSettled 确保即使某个供应商失败也不影响其他
    const results = await Promise.allSettled(
      providerCalls.map(async (provider) => {
        try {
          const overallStart = Date.now();
          const result = await provider.fn();

          // 保存音频文件
          const filename = `${provider.id}_${Date.now()}.mp3`;
          const filepath = path.join(audioDir, filename);

          // 如果有真实的音频数据，保存到文件
          if (result.audioBuffer && result.audioBuffer.length > 0) {
            await writeFile(filepath, result.audioBuffer);
          } else {
            // 如果是模拟数据（空 buffer），创建一个占位文件
            // 实际使用时应该有真实的音频数据
            console.warn(`${provider.name} 返回空音频数据，创建占位文件`);
            await writeFile(filepath, Buffer.from([]));
          }

          const endToEndTime = Date.now() - overallStart;

          return {
            provider: provider.name,
            audioUrl: `/api/storage/audio/${filename}`,
            duration: endToEndTime / 1000,
            ttfb: result.ttfb,
            totalTime: endToEndTime,
            providerLatencyMs: result.totalTime,
            providerDurationSec: result.duration,
            status: 'success',
          };
        } catch (error: any) {
          console.error(`${provider.name} 合成失败:`, error.message);
          return {
            provider: provider.name,
            audioUrl: '',
            duration: 0,
            status: 'failed',
            error: error.message,
          };
        }
      })
    );

    // 格式化结果
    const formattedResults = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          provider: '未知',
          audioUrl: '',
          duration: 0,
          status: 'failed',
          error: result.reason?.message || '未知错误',
        };
      }
    });

    return NextResponse.json({
      success: true,
      results: formattedResults,
    });
  } catch (error: any) {
    console.error('TTS API 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
