import { NextRequest, NextResponse } from 'next/server';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import { getTemplate } from '@/lib/providers/generic/template-loader';

/**
 * 从供应商API获取可用模型列表
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, providerConfig } = body;

    if (!providerConfig) {
      return NextResponse.json(
        { error: '缺少供应商配置' },
        { status: 400 }
      );
    }

    const config = providerConfig as GenericProviderConfig;

    // 如果配置了模板，从模板中获取模型列表
    if (config.templateType) {
      const template = await getTemplate(config.templateType);
      if (template?.models) {
        return NextResponse.json({
          success: true,
          models: template.models,
          source: 'template',
        });
      }
    }

    // 如果模板中没有模型，尝试从API获取
    // 这里可以实现实际的API调用逻辑
    // 例如：调用 OpenAI /v1/models 端点

    // 目前返回空列表
    return NextResponse.json({
      success: true,
      models: [],
      source: 'api',
      message: '该供应商不支持自动获取模型列表，请手动配置',
    });
  } catch (error: any) {
    console.error('获取模型列表失败:', error);
    return NextResponse.json(
      { error: error.message || '获取模型列表失败' },
      { status: 500 }
    );
  }
}

