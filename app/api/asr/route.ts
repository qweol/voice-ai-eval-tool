import { NextRequest, NextResponse } from 'next/server';
import { recognizeWithAliyun } from '@/lib/providers/aliyun';
import { recognizeWithTencent } from '@/lib/providers/tencent';
import { recognizeWithBaidu } from '@/lib/providers/baidu';
import { mockRecognize } from '@/lib/providers/mock';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // 并发调用所有供应商 API
    const providers = [
      { name: '阿里云', fn: () => recognizeWithAliyun(buffer) },
      { name: '腾讯云', fn: () => recognizeWithTencent(buffer) },
      { name: '百度', fn: () => recognizeWithBaidu(buffer) },
    ];

    // 使用 Promise.allSettled 确保即使某个供应商失败也不影响其他
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
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
