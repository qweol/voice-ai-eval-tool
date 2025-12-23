'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Baseline {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  snapshot: any;
}

interface ComparisonReport {
  id: string;
  name: string;
  summary: any;
  details: any[];
  createdAt: string;
}

export default function ComparePage() {
  const params = useParams();
  const batchId = params.id as string;

  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaselines, setSelectedBaselines] = useState<string[]>([]);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<any>(null);

  useEffect(() => {
    loadBaselines();
    loadCurrentBatch();
  }, [batchId]);

  const loadCurrentBatch = async () => {
    try {
      const response = await fetch(`/api/batch-test/${batchId}`);
      const result = await response.json();
      if (result.success) {
        setCurrentBatch(result.data);
      }
    } catch (error) {
      console.error('加载当前批次失败:', error);
    }
  };

  // 从批次配置中获取供应商名称
  const getProviderName = (providerId: string): string => {
    if (!currentBatch) return providerId;
    const batchConfig = currentBatch.config as any;
    const providerConfigs = batchConfig?.providerConfigs || {};
    const providerConfig = providerConfigs[providerId];
    return providerConfig?.name || providerId;
  };

  const loadBaselines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/batch-test/${batchId}/baseline`);
      const result = await response.json();

      if (result.success) {
        setBaselines(result.data);
      }
    } catch (error) {
      console.error('加载基线列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBaseline = async () => {
    const name = prompt('请输入基线名称:');
    if (!name) return;

    try {
      const response = await fetch(`/api/batch-test/${batchId}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (result.success) {
        alert('基线创建成功');
        loadBaselines();
      } else {
        alert('创建失败: ' + result.error);
      }
    } catch (error) {
      console.error('创建基线失败:', error);
      alert('创建失败');
    }
  };

  const handleCompare = async () => {
    if (selectedBaselines.length === 0) {
      alert('请至少选择一个基线');
      return;
    }

    try {
      setComparing(true);
      const response = await fetch(`/api/batch-test/${batchId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineIds: selectedBaselines,
          reportName: `对比报告 - ${new Date().toLocaleString('zh-CN')}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReport(result.data.comparison);
      } else {
        alert('对比失败: ' + result.error);
      }
    } catch (error) {
      console.error('对比失败:', error);
      alert('对比失败');
    } finally {
      setComparing(false);
    }
  };

  const handleToggleBaseline = (id: string) => {
    if (selectedBaselines.includes(id)) {
      setSelectedBaselines(selectedBaselines.filter((bid) => bid !== id));
    } else {
      setSelectedBaselines([...selectedBaselines, id]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href={`/batch-test/${batchId}`}>
                <button className="text-gray-600 hover:text-gray-800">← 返回</button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-800">历史对比</h1>
            </div>
            <p className="text-gray-600">选择基线版本进行对比分析</p>
          </div>
          <button
            onClick={handleCreateBaseline}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            创建基线
          </button>
        </div>

        {/* 基线选择 */}
        {!report && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">选择对比基线</h2>

            {baselines.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  还没有基线
                </h3>
                <p className="text-gray-600 mb-6">
                  创建基线后可以进行历史对比
                </p>
                <button
                  onClick={handleCreateBaseline}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  创建第一个基线
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {baselines.map((baseline) => (
                    <label
                      key={baseline.id}
                      className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBaselines.includes(baseline.id)}
                        onChange={() => handleToggleBaseline(baseline.id)}
                        className="w-5 h-5 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-1">
                          {baseline.name}
                        </div>
                        {baseline.description && (
                          <div className="text-sm text-gray-600 mb-2">
                            {baseline.description}
                          </div>
                        )}
                        <div className="flex gap-4 text-sm text-gray-600">
                          <div>
                            用例数: {baseline.snapshot.totalCases}
                          </div>
                          <div>
                            成功率: {baseline.snapshot.successRate ? Number(baseline.snapshot.successRate).toFixed(1) : '0.0'}%
                          </div>
                          <div>
                            创建时间:{' '}
                            {new Date(baseline.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleCompare}
                  disabled={comparing || selectedBaselines.length === 0}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {comparing ? '对比中...' : `开始对比 (已选择 ${selectedBaselines.length} 个基线)`}
                </button>
              </>
            )}
          </div>
        )}

        {/* 对比报告 */}
        {report && (
          <div className="space-y-6">
            {/* 总体摘要 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">对比摘要</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {report.summary.totalImproved}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">改进</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {report.summary.totalRegressed}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">退化</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-600">
                    {report.summary.totalUnchanged}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">无变化</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {report.summary.successRateChange > 0 ? '+' : ''}
                    {Number(report.summary.successRateChange).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">成功率变化</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">TTFB变化</div>
                  <div
                    className={`text-2xl font-bold ${
                      report.summary.ttfbChange < 0
                        ? 'text-green-600'
                        : report.summary.ttfbChange > 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {report.summary.ttfbChange != null ? (
                      <>
                        {report.summary.ttfbChange > 0 ? '+' : ''}
                        {Number(report.summary.ttfbChange).toFixed(1)}%
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">总耗时变化</div>
                  <div
                    className={`text-2xl font-bold ${
                      report.summary.speedChange < 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {report.summary.speedChange > 0 ? '+' : ''}
                    {Number(report.summary.speedChange).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">成本变化</div>
                  <div
                    className={`text-2xl font-bold ${
                      report.summary.costChange < 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {report.summary.costChange > 0 ? '+' : ''}
                    {Number(report.summary.costChange).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 详细对比 */}
            {report.details.map((detail, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  vs {detail.baselineName}
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {detail.improved}
                    </div>
                    <div className="text-sm text-gray-600">改进</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {detail.regressed}
                    </div>
                    <div className="text-sm text-gray-600">退化</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-600">
                      {detail.unchanged}
                    </div>
                    <div className="text-sm text-gray-600">无变化</div>
                  </div>
                </div>

                {/* 问题用例 */}
                {detail.caseComparisons.filter((c: any) => c.status === 'regressed')
                  .length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      退化的用例 ({detail.caseComparisons.filter((c: any) => c.status === 'regressed').length})
                    </h4>
                    <div className="space-y-2">
                      {detail.caseComparisons
                        .filter((c: any) => c.status === 'regressed')
                        .slice(0, 5)
                        .map((comparison: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-red-50 border border-red-200 rounded"
                          >
                            <div className="text-sm text-gray-800 mb-1">
                              {comparison.testCaseText}
                            </div>
                            <div className="text-xs text-gray-600">
                              供应商: {getProviderName(comparison.provider)} | TTFB变化:{' '}
                              {comparison.ttfbChange != null ? (
                                <>
                                  {comparison.ttfbChange > 0 ? '+' : ''}
                                  {Number(comparison.ttfbChange).toFixed(1)}%
                                </>
                              ) : (
                                '-'
                              )}{' '}
                              | 总耗时变化:{' '}
                              {comparison.durationChange > 0 ? '+' : ''}
                              {Number(comparison.durationChange).toFixed(1)}% | 成本变化:{' '}
                              {comparison.costChange > 0 ? '+' : ''}
                              {Number(comparison.costChange).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-4">
              <button
                onClick={() => setReport(null)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                重新对比
              </button>
              <Link href={`/batch-test/${batchId}`}>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  返回详情
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
