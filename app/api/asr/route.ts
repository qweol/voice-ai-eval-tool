import { NextRequest, NextResponse } from 'next/server';
import { callGenericASR } from '@/lib/providers/generic/caller';
import { ASROptions } from '@/lib/types';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import { getSystemProviders } from '@/lib/providers/system-providers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = (formData.get('language') as string) || 'zh';
    const format = (formData.get('format') as string) || 'wav';
    const providersStr = formData.get('providers') as string;

    if (!file) {
      return NextResponse.json(
        { error: '未上传文件' },
        { status: 400 }
      );
    }

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`收到音频文件: ${file.name}, 大小: ${(buffer.length / 1024).toFixed(2)} KB`);

    // 解析提供者配置
    const providers: GenericProviderConfig[] = providersStr
      ? JSON.parse(providersStr)
      : [];

    // 获取系统预置供应商（包含完整 API Key）
    const systemProviders = getSystemProviders();

    // 合并供应商配置：如果是系统预置供应商，使用服务器端的完整配置
    const mergedProviders = providers.map(provider => {
      if (provider.isSystem) {
        // 从系统预置供应商中查找完整配置
        const systemProvider = systemProviders.find(sp => sp.id === provider.id);
        if (systemProvider) {
          console.log(`使用系统预置供应商: ${systemProvider.name}`);
          // 合并用户的覆盖配置（如模型选择），但保留系统的 API Key
          const { apiKey: _, ...userOverrides } = provider;
          return {
            ...systemProvider,
            ...userOverrides,
            apiKey: systemProvider.apiKey, // 确保使用系统的 API Key
          };
        }
      }
      return provider;
    });

    // 构建ASR选项
    const asrOptions: ASROptions = {
      language,
      format,
    };

    // 筛选支持ASR的提供者
    const asrProviders = mergedProviders.filter(
      (p) => p.serviceType === 'asr' || p.serviceType === 'both'
    );

    // 构建提供者调用列表
    const providerCalls = asrProviders.map((provider) => ({
      name: provider.name,
      id: provider.id,
      fn: () => callGenericASR(provider, buffer, asrOptions),
    }));

    // 使用 Promise.allSettled 确保即使某个供应商失败也不影响其他
    const results = await Promise.allSettled(
      providerCalls.map(async (provider) => {
        try {
          const result = await provider.fn();
          return {
            provider: provider.name,
            text: result.text,
            duration: result.duration,
            confidence: result.confidence,
            status: 'success',
          };
        } catch (error: any) {
          console.error(`${provider.name} 识别失败:`, error.message);
          return {
            provider: provider.name,
            text: '',
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
          text: '',
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
    console.error('ASR API 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 配置 API 路由
export const config = {
  api: {
    bodyParser: false,
  },
};
