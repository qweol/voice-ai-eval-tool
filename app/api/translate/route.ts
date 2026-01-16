import { NextRequest, NextResponse } from 'next/server';
import { getTranslator } from '@/lib/utils/translator';

/**
 * POST /api/translate
 * 翻译文本到中文
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, texts, targetLang = 'zh-CN' } = body;

    // 验证输入
    if (!text && (!texts || !Array.isArray(texts))) {
      return NextResponse.json(
        { error: 'Missing required parameter: text or texts' },
        { status: 400 }
      );
    }

    const translator = getTranslator();

    // 单个文本翻译
    if (text) {
      const translatedText = await translator.translate(text, targetLang);
      return NextResponse.json({
        success: true,
        translatedText,
      });
    }

    // 批量翻译
    if (texts && Array.isArray(texts)) {
      const translatedTexts = await translator.translateBatch(texts, targetLang);
      return NextResponse.json({
        success: true,
        translatedTexts,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Translation API error:', error);

    // 检查是否是API密钥未配置的错误
    if (error.message?.includes('API key is not configured')) {
      return NextResponse.json(
        {
          error: 'Translation service not configured',
          message: 'Please set OPENAI_API_KEY in environment variables'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Translation failed',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
