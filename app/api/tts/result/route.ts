import { NextRequest, NextResponse } from 'next/server';
import { getTtsJob } from '@/lib/tts/job-store';

export const runtime = 'nodejs';

/**
 * GET /api/tts/result?jobId=xxx
 * 获取任务结果（完成后前端再拉取）
 */
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId') || '';
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId 不能为空' }, { status: 400 });
    }

    const job = getTtsJob(jobId);
    if (!job) {
      return NextResponse.json({ success: false, error: '任务不存在或已过期' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: job.status,
        error: job.error,
        results: job.results,
      },
    });
  } catch (error: any) {
    console.error('获取 TTS 结果失败:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}


