import { NextResponse } from 'next/server';
import { getSystemProvidersForDisplay, getSystemProviders } from '@/lib/providers/system-providers';

/**
 * GET /api/providers/system
 * 获取系统预置供应商列表（用于前端显示，隐藏完整 API Key）
 */
export async function GET() {
  try {
    const providers = getSystemProvidersForDisplay();

    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error: any) {
    console.error('获取系统预置供应商失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers/system/full
 * 获取系统预置供应商的完整配置（包含完整 API Key）
 * 用于批量测试等需要实际调用 API 的场景
 */
export async function POST() {
  try {
    const providers = getSystemProviders();

    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error: any) {
    console.error('获取系统预置供应商完整配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
