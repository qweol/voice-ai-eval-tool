import { NextRequest, NextResponse } from 'next/server';
import { getMinimaxVoices, fetchMinimaxVoices, initializeMinimaxVoices } from '@/lib/providers/minimax-voices';

// 懒加载初始化（第一次调用时初始化）
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initializeMinimaxVoices();
    initialized = true;
  }
}

/**
 * GET /api/providers/minimax/voices
 * 获取 Minimax 可用音色列表
 * 
 * 查询参数：
 * - refresh: 是否强制刷新（默认 false，使用缓存）
 */
export async function GET(request: NextRequest) {
  try {
    // 确保已初始化（懒加载）
    await ensureInitialized();

    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // 从请求头或环境变量获取 API Key
    const apiKey = request.headers.get('x-minimax-api-key') || process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Minimax API Key 未设置。请设置环境变量 MINIMAX_API_KEY 或在请求头中提供 x-minimax-api-key' 
        },
        { status: 400 }
      );
    }

    const voices = await getMinimaxVoices(apiKey, forceRefresh);

    return NextResponse.json({
      success: true,
      data: voices,
      count: voices.length,
      cached: !forceRefresh && voices.length > 0,
    });
  } catch (error: any) {
    console.error('获取 Minimax 音色列表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '获取音色列表失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers/minimax/voices
 * 强制刷新 Minimax 音色列表（从 API 重新查询）
 */
export async function POST(request: NextRequest) {
  try {
    // 确保已初始化（懒加载）
    await ensureInitialized();

    const body = await request.json().catch(() => ({}));
    const apiKey = body.apiKey || request.headers.get('x-minimax-api-key') || process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Minimax API Key 未设置' 
        },
        { status: 400 }
      );
    }

    // 强制从 API 查询
    const voices = await fetchMinimaxVoices(apiKey);

    return NextResponse.json({
      success: true,
      data: voices,
      count: voices.length,
      cached: false,
      message: '音色列表已刷新',
    });
  } catch (error: any) {
    console.error('刷新 Minimax 音色列表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '刷新音色列表失败' 
      },
      { status: 500 }
    );
  }
}

