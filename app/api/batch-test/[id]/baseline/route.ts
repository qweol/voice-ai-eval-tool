import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/batch-test/[id]/baseline
 * 创建对比基线
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // 获取批次及其结果
    const batch = await prisma.batchTest.findUnique({
      where: { id },
      include: {
        testCases: true,
        results: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    // 创建快照
    const snapshot = {
      batchId: batch.id,
      batchName: batch.name,
      category: batch.category,
      providers: batch.providers,
      totalCases: batch.totalCases,
      completedCases: batch.completedCases,
      failedCases: batch.failedCases,
      successRate: batch.successRate ? parseFloat(batch.successRate.toString()) : null,
      avgDuration: batch.avgDuration ? parseFloat(batch.avgDuration.toString()) : null,
      totalCost: batch.totalCost ? parseFloat(batch.totalCost.toString()) : null,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
      testCases: batch.testCases.map((tc: any) => ({
        id: tc.id,
        text: tc.text,
        category: tc.category,
        tags: tc.tags,
      })),
      results: batch.results.map((r: any) => ({
        testCaseId: r.testCaseId,
        provider: r.provider,
        status: r.status,
        duration: r.duration ? parseFloat(r.duration.toString()) : null,
        cost: r.cost ? parseFloat(r.cost.toString()) : null,
        userRating: r.userRating,
      })),
    };

    // 创建基线
    const baseline = await prisma.comparisonBaseline.create({
      data: {
        name: name || `${batch.name} - 基线`,
        batchId: id,
        description,
        snapshot,
      },
    });

    return NextResponse.json({
      success: true,
      data: baseline,
    });
  } catch (error: any) {
    console.error('创建基线失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch-test/[id]/baseline
 * 获取批次的所有基线
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const baselines = await prisma.comparisonBaseline.findMany({
      where: { batchId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: baselines,
    });
  } catch (error: any) {
    console.error('获取基线列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
