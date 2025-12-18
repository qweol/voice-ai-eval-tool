import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/batch-test/[id]/compare
 * 对比当前批次与历史基线
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { baselineIds, reportName } = body;

    if (!baselineIds || baselineIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择至少一个基线' },
        { status: 400 }
      );
    }

    // 获取当前批次
    const currentBatch = await prisma.batchTest.findUnique({
      where: { id },
      include: {
        testCases: true,
        results: {
          include: {
            testCase: true,
          },
        },
      },
    });

    if (!currentBatch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    // 获取基线数据
    const baselines = await prisma.comparisonBaseline.findMany({
      where: {
        id: { in: baselineIds },
      },
    });

    if (baselines.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到基线数据' },
        { status: 404 }
      );
    }

    // 执行对比计算
    const comparison = compareWithBaselines(currentBatch, baselines);

    // 保存对比报告
    const report = await prisma.comparisonReport.create({
      data: {
        name: reportName || `${currentBatch.name} - 对比报告`,
        currentBatchId: id,
        baselineBatchIds: baselineIds,
        summary: comparison.summary,
        details: comparison.details,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        comparison,
      },
    });
  } catch (error: any) {
    console.error('对比失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 对比当前批次与基线
 */
function compareWithBaselines(currentBatch: any, baselines: any[]): any {
  const summary: any = {
    totalImproved: 0,
    totalRegressed: 0,
    totalUnchanged: 0,
    ttfbChange: 0,
    speedChange: 0,
    costChange: 0,
    successRateChange: 0,
  };

  const details: any[] = [];

  // 对每个基线进行对比
  for (const baseline of baselines) {
    const baselineSnapshot = baseline.snapshot as any;

    // 计算整体指标变化
    const currentSuccessRate = currentBatch.successRate
      ? parseFloat(currentBatch.successRate.toString())
      : 0;
    const baselineSuccessRate = baselineSnapshot.successRate || 0;
    const successRateChange = currentSuccessRate - baselineSuccessRate;

    const currentAvgDuration = currentBatch.avgDuration
      ? parseFloat(currentBatch.avgDuration.toString())
      : 0;
    const baselineAvgDuration = baselineSnapshot.avgDuration || 0;
    const speedChange =
      baselineAvgDuration > 0
        ? ((currentAvgDuration - baselineAvgDuration) / baselineAvgDuration) * 100
        : 0;

    const currentTotalCost = currentBatch.totalCost
      ? parseFloat(currentBatch.totalCost.toString())
      : 0;
    const baselineTotalCost = baselineSnapshot.totalCost || 0;
    const costChange =
      baselineTotalCost > 0
        ? ((currentTotalCost - baselineTotalCost) / baselineTotalCost) * 100
        : 0;

    // 计算平均 TTFB 变化
    const currentResultsWithTtfb = currentBatch.results.filter((r: any) => r.ttfb != null);
    const baselineResultsWithTtfb = baselineSnapshot.results?.filter((r: any) => r.ttfb != null) || [];

    let ttfbChange = 0;
    if (currentResultsWithTtfb.length > 0 && baselineResultsWithTtfb.length > 0) {
      const currentAvgTtfb = currentResultsWithTtfb.reduce((sum: number, r: any) => sum + (r.ttfb || 0), 0) / currentResultsWithTtfb.length;
      const baselineAvgTtfb = baselineResultsWithTtfb.reduce((sum: number, r: any) => sum + (r.ttfb || 0), 0) / baselineResultsWithTtfb.length;

      if (baselineAvgTtfb > 0) {
        ttfbChange = ((currentAvgTtfb - baselineAvgTtfb) / baselineAvgTtfb) * 100;
      }
    }

    // 对比每个测试用例
    const caseComparisons: any[] = [];
    let improved = 0;
    let regressed = 0;
    let unchanged = 0;

    for (const testCase of currentBatch.testCases) {
      const currentResults = currentBatch.results.filter(
        (r: any) => r.testCaseId === testCase.id
      );

      const baselineResults = baselineSnapshot.results.filter(
        (r: any) => r.testCaseId === testCase.id
      );

      for (const provider of currentBatch.providers) {
        const currentResult = currentResults.find((r: any) => r.provider === provider);
        const baselineResult = baselineResults.find((r: any) => r.provider === provider);

        if (currentResult && baselineResult) {
          const currentDuration = currentResult.duration
            ? parseFloat(currentResult.duration.toString())
            : 0;
          const baselineDuration = baselineResult.duration || 0;
          const durationChange =
            baselineDuration > 0
              ? ((currentDuration - baselineDuration) / baselineDuration) * 100
              : 0;

          const currentCost = currentResult.cost
            ? parseFloat(currentResult.cost.toString())
            : 0;
          const baselineCost = baselineResult.cost || 0;
          const costChangePercent =
            baselineCost > 0 ? ((currentCost - baselineCost) / baselineCost) * 100 : 0;

          // 计算 TTFB 变化
          let ttfbChange: number | null = null;
          if (currentResult.ttfb != null && baselineResult.ttfb != null && baselineResult.ttfb > 0) {
            ttfbChange = ((currentResult.ttfb - baselineResult.ttfb) / baselineResult.ttfb) * 100;
          }

          // 判断改进/退化
          let status = 'unchanged';
          if (
            currentResult.status === 'SUCCESS' &&
            baselineResult.status === 'FAILED'
          ) {
            status = 'improved';
            improved++;
          } else if (
            currentResult.status === 'FAILED' &&
            baselineResult.status === 'SUCCESS'
          ) {
            status = 'regressed';
            regressed++;
          } else if (durationChange < -5 || costChangePercent < -5) {
            status = 'improved';
            improved++;
          } else if (durationChange > 5 || costChangePercent > 5) {
            status = 'regressed';
            regressed++;
          } else {
            unchanged++;
          }

          caseComparisons.push({
            testCaseId: testCase.id,
            testCaseText: testCase.text,
            provider,
            status,
            currentStatus: currentResult.status,
            baselineStatus: baselineResult.status,
            ttfbChange,
            durationChange,
            costChange: costChangePercent,
            currentDuration,
            baselineDuration,
            currentCost,
            baselineCost,
          });
        }
      }
    }

    summary.totalImproved += improved;
    summary.totalRegressed += regressed;
    summary.totalUnchanged += unchanged;
    summary.ttfbChange += ttfbChange;
    summary.speedChange += speedChange;
    summary.costChange += costChange;
    summary.successRateChange += successRateChange;

    details.push({
      baselineId: baseline.id,
      baselineName: baseline.name,
      baselineCreatedAt: baseline.createdAt,
      successRateChange,
      ttfbChange,
      speedChange,
      costChange,
      improved,
      regressed,
      unchanged,
      caseComparisons,
    });
  }

  // 计算平均值
  const baselineCount = baselines.length;
  if (baselineCount > 0) {
    summary.ttfbChange /= baselineCount;
    summary.speedChange /= baselineCount;
    summary.costChange /= baselineCount;
    summary.successRateChange /= baselineCount;
  }

  return { summary, details };
}
