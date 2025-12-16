import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BatchTestStatus, TestResultStatus } from '@prisma/client';
import { executeBatchTest } from '@/lib/batch-test/executor';

/**
 * POST /api/batch-test/[id]/execute
 * 执行批量测试
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await prisma.batchTest.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    if (batch.status === BatchTestStatus.RUNNING) {
      return NextResponse.json(
        { success: false, error: '测试正在运行中' },
        { status: 400 }
      );
    }

    if (batch.testCases.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有测试用例' },
        { status: 400 }
      );
    }

    const providers = Array.isArray(batch.providers) ? batch.providers : [];
    if (providers.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择至少一个供应商' },
        { status: 400 }
      );
    }

    // 更新批次状态为运行中
    await prisma.batchTest.update({
      where: { id },
      data: {
        status: BatchTestStatus.RUNNING,
        startedAt: new Date(),
        completedCases: 0,
        failedCases: 0,
      },
    });

    // 异步执行测试（不阻塞响应）
    executeBatchTest(id).catch((error) => {
      console.error('批量测试执行失败:', error);
    });

    return NextResponse.json({
      success: true,
      message: '测试已开始执行',
      data: {
        batchId: id,
        totalCases: batch.testCases.length,
        providers: providers,
      },
    });
  } catch (error: any) {
    console.error('启动批量测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch-test/[id]/execute
 * 获取测试执行进度
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await prisma.batchTest.findUnique({
      where: { id },
      select: {
        status: true,
        totalCases: true,
        completedCases: true,
        failedCases: true,
        successRate: true,
        avgDuration: true,
        totalCost: true,
        startedAt: true,
        completedAt: true,
        providers: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    // 计算实际总测试次数：用例数 × 供应商数
    const batchProviders = Array.isArray(batch.providers) ? batch.providers : [];
    const actualTotal = batch.totalCases * (batchProviders.length || 1);

    const progress = {
      status: batch.status,
      total: actualTotal,
      completed: batch.completedCases,
      failed: batch.failedCases,
      successRate: batch.successRate ? parseFloat(batch.successRate.toString()) : null,
      avgDuration: batch.avgDuration ? parseFloat(batch.avgDuration.toString()) : null,
      totalCost: batch.totalCost ? parseFloat(batch.totalCost.toString()) : null,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      percentage: actualTotal > 0
        ? Math.min(100, Math.round((batch.completedCases / actualTotal) * 100))
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error('获取测试进度失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/batch-test/[id]/execute
 * 取消/停止测试
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await prisma.batchTest.findUnique({
      where: { id },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    if (batch.status !== BatchTestStatus.RUNNING) {
      return NextResponse.json(
        { success: false, error: '测试未在运行中' },
        { status: 400 }
      );
    }

    // 更新状态为暂停
    await prisma.batchTest.update({
      where: { id },
      data: {
        status: BatchTestStatus.PAUSED,
      },
    });

    return NextResponse.json({
      success: true,
      message: '测试已暂停',
    });
  } catch (error: any) {
    console.error('停止测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
