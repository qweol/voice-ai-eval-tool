import { NextRequest, NextResponse } from 'next/server';
import { createTtsJob, getTtsJob, ttsJobs } from '@/lib/tts/job-store';
import { executeTtsJob, TtsExecutePayload } from '@/lib/tts/executor';

export const runtime = 'nodejs';

/**
 * POST /api/tts/execute
 * 启动 TTS 批量合成任务（异步，不阻塞响应）
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TtsExecutePayload;
    const { text, providerVoices, providers, batchCount } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: '文本不能为空' }, { status: 400 });
    }

    const safeBatchCount = Math.max(1, Math.min(10, Number.isFinite(batchCount as number) ? (batchCount as number) : 1));
    const enabledProviderIds = new Set((providerVoices || []).filter(p => p.enabled).map(p => p.providerId));
    const ttsProviders = (providers || []).filter(p => (p.serviceType === 'tts' || p.serviceType === 'both') && enabledProviderIds.has(p.id));
    const total = ttsProviders.length * safeBatchCount;

    const job = createTtsJob({ total });
    console.log(`[TTS Execute] 创建任务: jobId=${job.jobId}, total=${job.total}, Map.size=${ttsJobs.size}`);

    // 异步执行（不阻塞响应）
    executeTtsJob(job.jobId, { ...body, batchCount: safeBatchCount }).catch((error) => {
      console.error('TTS 任务执行失败:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.jobId,
        total: job.total,
      },
    });
  } catch (error: any) {
    console.error('启动 TTS 任务失败:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/tts/execute?jobId=xxx
 * 查询 TTS 任务进度
 */
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId') || '';
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId 不能为空' }, { status: 400 });
    }

    const cursorRaw = request.nextUrl.searchParams.get('cursor');
    const cursor = cursorRaw ? Math.max(0, Math.trunc(Number(cursorRaw))) : 0;
    const full = request.nextUrl.searchParams.get('full') === '1';

    console.log(`[TTS Execute GET] 查询 jobId=${jobId}, Map.size=${ttsJobs.size}, keys=[${Array.from(ttsJobs.keys()).join(', ')}]`);

    const job = getTtsJob(jobId);
    if (!job) {
      console.warn(`[TTS Execute GET] 任务不存在: jobId=${jobId}`);
      return NextResponse.json({ success: false, error: '任务不存在或已过期' }, { status: 404 });
    }

    const resultsCount = Array.isArray(job.results) ? job.results.length : 0;
    const safeCursor = Number.isFinite(cursor) ? Math.min(cursor, resultsCount) : 0;
    const resultsDelta = Array.isArray(job.results) ? job.results.slice(safeCursor) : [];
    const nextCursor = resultsCount;
    const shouldReturnFullResults = full || job.status === 'COMPLETED' || job.status === 'FAILED';

    return NextResponse.json({
      success: true,
      data: {
        status: job.status,
        total: job.total,
        completed: job.completed,
        failed: job.failed,
        percentage: job.percentage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        current: job.current,
        error: job.error,
        results: shouldReturnFullResults ? job.results : undefined,
        resultsDelta: shouldReturnFullResults ? undefined : resultsDelta,
        resultsCount,
        cursor: safeCursor,
        nextCursor,
      },
    });
  } catch (error: any) {
    console.error('获取 TTS 进度失败:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}


