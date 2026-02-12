'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getConfig, createBadCase } from '@/lib/utils/config';
import { BadCaseStatus, BadCaseSeverity, BadCaseCategory } from '@/lib/types';

interface BatchTest {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  providers: string[];
  config: any;
  totalCases: number;
  completedCases: number;
  failedCases: number;
  successRate?: number;
  avgDuration?: number;
  totalCost?: number;
  createdAt: string;
  completedAt?: string;
  testCases: TestCase[];
  results: TestResult[];
}

interface TestCase {
  id: string;
  text: string;
  category?: string;
  expectedVoice?: string;
  tags: string[];
  orderIndex: number;
}

interface TestResult {
  id: string;
  testCaseId: string;
  provider: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  audioUrl?: string;
  duration?: number;
  ttfb?: number | null;
  totalTime?: number;
  cost?: number;
  error?: string;
  userRating?: any;
}

type BatchTestExportReportV1 = {
  reportVersion: 1;
  generatedAt: string;
  batch: {
    id: string;
    name: string;
    description?: string;
    category: string;
    tags: string[];
    status: BatchTest['status'];
    createdAt: string;
    completedAt?: string;
  };
  config: any;
  providers: string[];
  summary: {
    totalCases: number;
    providerCount: number;
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    timeoutRuns: number;
    successRate: number | null;
    avgDurationSec: number | null;
    totalCostUsd: number | null;
  };
  cases: Array<{
    id: string;
    orderIndex: number;
    text: string;
    category?: string;
    expectedVoice?: string;
    tags: string[];
    results: TestResult[];
  }>;
  results: TestResult[];
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  RUNNING: '运行中',
  COMPLETED: '已完成',
  FAILED: '失败',
  PAUSED: '已暂停',
};

export default function BatchTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'results' | 'settings'>('cases');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [batchCount, setBatchCount] = useState(1); // 批量运行次数，默认1次

  useEffect(() => {
    loadBatch();
  }, [batchId]);

  useEffect(() => {
    if (batch?.status === 'RUNNING') {
      const interval = setInterval(loadProgress, 2000);
      return () => clearInterval(interval);
    }
  }, [batch?.status]);

  const loadBatch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/batch-test/${batchId}`);
      const result = await response.json();

      if (result.success) {
        setBatch(result.data);
      }
    } catch (error) {
      console.error('加载批次详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(`/api/batch-test/${batchId}/execute`);
      const result = await response.json();

      if (result.success) {
        setProgress(result.data);
        if (result.data.status !== 'RUNNING') {
          loadBatch();
        }
      }
    } catch (error) {
      console.error('加载进度失败:', error);
    }
  };

  const handleExecute = async () => {
    if (!batch) return;

    if (batch.testCases.length === 0) {
      alert('请先添加测试用例');
      return;
    }

    if (batch.providers.length === 0) {
      alert('请先选择供应商');
      return;
    }

    const totalCalls = batch.testCases.length * batch.providers.length * batchCount;
    if (!confirm(`确定要执行测试吗？\n\n将测试 ${batch.testCases.length} 个用例 × ${batch.providers.length} 个供应商 × ${batchCount} 次 = ${totalCalls} 次调用`)) {
      return;
    }

    try {
      setExecuting(true);
      const response = await fetch(`/api/batch-test/${batchId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchCount }),
      });

      const result = await response.json();

      if (result.success) {
        alert('测试已开始执行');
        loadBatch();
      } else {
        alert('执行失败: ' + result.error);
      }
    } catch (error) {
      console.error('执行失败:', error);
      alert('执行失败');
    } finally {
      setExecuting(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('确定要停止测试吗？')) return;

    try {
      const response = await fetch(`/api/batch-test/${batchId}/execute`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadBatch();
      }
    } catch (error) {
      console.error('停止失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">批次不存在</h2>
          <Link href="/batch-test">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              返回列表
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/batch-test">
              <button className="text-gray-600 hover:text-gray-800">← 返回</button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">{batch.name}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {STATUS_LABELS[batch.status]}
            </span>
          </div>

          {batch.description && (
            <p className="text-gray-600 mb-4">{batch.description}</p>
          )}

          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">测试用例</div>
              <div className="text-2xl font-bold text-gray-800">{batch.totalCases}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">供应商</div>
              <div className="text-2xl font-bold text-gray-800">{batch.providers.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">总测试次数</div>
              <div className="text-2xl font-bold text-blue-600">
                {batch.totalCases * batch.providers.length}
              </div>
            </div>
            {batch.status === 'RUNNING' && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">已完成</div>
                <div className="text-2xl font-bold text-blue-600">
                  {batch.completedCases}/{batch.totalCases * batch.providers.length}
                </div>
              </div>
            )}
            {batch.status === 'COMPLETED' && (
              <>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">成功率</div>
                  <div className="text-2xl font-bold text-green-600">
                    {batch.successRate ? Number(batch.successRate).toFixed(1) : '0.0'}%
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">平均耗时</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {batch.avgDuration ? Number(batch.avgDuration).toFixed(2) : '0.00'}s
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600">总成本</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${batch.totalCost ? Number(batch.totalCost).toFixed(4) : '0.0000'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 进度条 */}
          {batch.status === 'RUNNING' && progress && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">执行进度</span>
                <span className="text-sm text-gray-600">
                  {progress.completed}/{progress.total} ({progress.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4 items-center flex-wrap">
            {batch.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  导入用例
                </button>
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  选择供应商
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">批量次数</span>
                  <select
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {Array.from({ length: 10 }, (_, idx) => idx + 1).map(n => (
                      <option key={n} value={n}>
                        {n} 次
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExecute}
                  disabled={executing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {executing ? '启动中...' : '开始测试'}
                </button>
              </>
            )}
            {batch.status === 'RUNNING' && (
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                停止测试
              </button>
            )}
            {batch.status === 'COMPLETED' && (
              <Link href={`/batch-test/${batchId}/compare`}>
                <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  历史对比
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* 标签页 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'cases'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                测试用例 ({batch.testCases.length})
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'results'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                测试结果 ({batch.results.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                设置
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'cases' && (
              <TestCasesTab batch={batch} onUpdate={loadBatch} />
            )}
            {activeTab === 'results' && (
              <TestResultsTab batch={batch} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab batch={batch} onUpdate={loadBatch} />
            )}
          </div>
        </div>
      </div>

      {/* 导入模态框 */}
      {showImportModal && (
        <ImportModal
          batchId={batchId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadBatch();
          }}
        />
      )}

      {/* 选择供应商模态框 */}
      {showProviderModal && (
        <ProviderModal
          batchId={batchId}
          currentProviders={batch.providers}
          onClose={() => setShowProviderModal(false)}
          onSuccess={() => {
            setShowProviderModal(false);
            loadBatch();
          }}
        />
      )}
    </div>
  );
}

function TestCasesTab({ batch, onUpdate }: { batch: BatchTest; onUpdate: () => void }) {
  if (!Array.isArray(batch.testCases) || batch.testCases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">还没有测试用例</h3>
        <p className="text-gray-600">点击"导入用例"按钮添加测试用例</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batch.testCases.map((testCase, index) => (
        <div key={testCase.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-start gap-4">
            <div className="text-gray-500 font-mono">{index + 1}</div>
            <div className="flex-1">
              <div className="text-gray-800 mb-2">{testCase.text}</div>
              {Array.isArray(testCase.tags) && testCase.tags.length > 0 && (
                <div className="flex gap-2">
                  {testCase.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestResultsTab({ batch }: { batch: BatchTest }) {
  const [showBadCaseModal, setShowBadCaseModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{ testCase: TestCase; result: TestResult } | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (!Array.isArray(batch.results) || batch.results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">还没有测试结果</h3>
        <p className="text-gray-600">执行测试后查看结果</p>
      </div>
    );
  }

  // 按用例+供应商分组，计算统计信息
  const resultsByCase = Array.isArray(batch.testCases) ? batch.testCases.map((testCase) => {
    const caseResults = batch.results.filter((r) => r.testCaseId === testCase.id);

    // 按供应商分组
    const providerGroups = new Map<string, TestResult[]>();
    caseResults.forEach((result) => {
      const key = result.provider;
      if (!providerGroups.has(key)) {
        providerGroups.set(key, []);
      }
      providerGroups.get(key)!.push(result);
    });

    // 计算每个供应商的统计信息
    const providerStats = Array.from(providerGroups.entries()).map(([provider, results]) => {
      const successResults = results.filter(r => r.status === 'SUCCESS');
      const failedResults = results.filter(r => r.status !== 'SUCCESS');

      // 计算统计信息
      const ttfbValues = successResults.map(r => r.ttfb).filter((v): v is number => v != null);
      const totalTimeValues = successResults.map(r => r.totalTime).filter((v): v is number => v != null);
      const costValues = successResults.map(r => r.cost).filter((v): v is number => typeof v === 'number');

      return {
        provider,
        results,
        successCount: successResults.length,
        failedCount: failedResults.length,
        stats: {
          ttfb: ttfbValues.length > 0 ? {
            avg: ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length,
            min: Math.min(...ttfbValues),
            max: Math.max(...ttfbValues),
          } : null,
          totalTime: totalTimeValues.length > 0 ? {
            avg: totalTimeValues.reduce((a, b) => a + b, 0) / totalTimeValues.length,
            min: Math.min(...totalTimeValues),
            max: Math.max(...totalTimeValues),
          } : null,
          cost: costValues.length > 0 ? {
            avg: costValues.reduce((a, b) => a + b, 0) / costValues.length,
            sum: costValues.reduce((a, b) => a + b, 0),
          } : null,
        },
      };
    });

    return {
      testCase,
      providerStats,
    };
  }) : [];

  // 从批次配置中获取供应商名称
  const getProviderName = (providerId: string): string => {
    const batchConfig = batch.config as any;
    const providerConfigs = batchConfig?.providerConfigs || {};
    const providerConfig = providerConfigs[providerId];
    // 如果找到配置且有名称，使用名称；否则使用 ID
    return providerConfig?.name || providerId;
  };

  const handleMarkAsBadCase = (testCase: TestCase, result: TestResult) => {
    setSelectedResult({ testCase, result });
    setShowBadCaseModal(true);
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const handleToggleProvider = (providerId: string) => {
    const newSelected = new Set(selectedProviders);
    if (newSelected.has(providerId)) {
      newSelected.delete(providerId);
    } else {
      newSelected.add(providerId);
    }
    setSelectedProviders(newSelected);
  };

  const handleSelectAll = () => {
    const allProviders = new Set(batch.providers);
    setSelectedProviders(allProviders);
  };

  const handleDeselectAll = () => {
    setSelectedProviders(new Set());
  };

  const exportSelectedProviders = () => {
    if (selectedProviders.size === 0) {
      alert('请先选择要导出的模型');
      return;
    }

    const selectedList = Array.from(selectedProviders).map(providerId => {
      const providerName = getProviderName(providerId);
      return { id: providerId, name: providerName };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      batchId: batch.id,
      batchName: batch.name,
      selectedProviders: selectedList,
      count: selectedList.length,
    };

    const pretty = JSON.stringify(exportData, null, 2);
    const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `selected_providers_${batch.id}_${ts}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportJsonReport = () => {
    const totalRuns = batch.results.length;
    const successRuns = batch.results.filter(r => r.status === 'SUCCESS').length;
    const failedRuns = batch.results.filter(r => r.status === 'FAILED').length;
    const timeoutRuns = batch.results.filter(r => r.status === 'TIMEOUT').length;

    const durationValues = batch.results
      .filter(r => r.status === 'SUCCESS')
      .map(r => (typeof r.duration === 'number' ? r.duration : null))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const avgDurationSec = durationValues.length > 0
      ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length
      : null;

    const costValues = batch.results
      .filter(r => r.status === 'SUCCESS')
      .map(r => (typeof r.cost === 'number' ? r.cost : null))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const totalCostUsd = costValues.length > 0
      ? costValues.reduce((a, b) => a + b, 0)
      : null;

    const report: BatchTestExportReportV1 = {
      reportVersion: 1,
      generatedAt: new Date().toISOString(),
      batch: {
        id: batch.id,
        name: batch.name,
        description: batch.description,
        category: batch.category,
        tags: batch.tags || [],
        status: batch.status,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt,
      },
      config: batch.config,
      providers: batch.providers || [],
      summary: {
        totalCases: batch.totalCases ?? batch.testCases.length,
        providerCount: batch.providers?.length ?? 0,
        totalRuns,
        successRuns,
        failedRuns,
        timeoutRuns,
        successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : null,
        avgDurationSec,
        totalCostUsd,
      },
      cases: resultsByCase.map(({ testCase, providerStats }) => ({
        id: testCase.id,
        orderIndex: testCase.orderIndex,
        text: testCase.text,
        category: testCase.category,
        expectedVoice: testCase.expectedVoice,
        tags: testCase.tags || [],
        results: providerStats.flatMap(stat => stat.results),
      })),
      results: batch.results,
    };

    const pretty = JSON.stringify(report, null, 2);
    const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `batch_test_report_${batch.id}_${ts}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            全选
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            取消全选
          </button>
          <button
            onClick={exportSelectedProviders}
            disabled={selectedProviders.size === 0}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导出选中模型 ({selectedProviders.size})
          </button>
        </div>
        <button
          onClick={exportJsonReport}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          title="导出当前批次的用例、配置与结果明细"
        >
          导出 JSON 报告
        </button>
      </div>
      <div className="space-y-6">
        {resultsByCase.map(({ testCase, providerStats }) => (
          <div key={testCase.id} className="border rounded-lg p-4">
            <div className="font-medium text-gray-800 mb-4">{testCase.text}</div>
            <div className="grid gap-4">
              {providerStats.map((stat) => {
                const groupKey = `${testCase.id}-${stat.provider}`;
                const isExpanded = expandedGroups.has(groupKey);

                return (
                  <div key={stat.provider} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-4 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedProviders.has(stat.provider)}
                        onChange={() => handleToggleProvider(stat.provider)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        title="选择此模型"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-700 mb-1">
                          {getProviderName(stat.provider)} ({stat.results.length} 次运行)
                        </div>
                        <div className="text-sm text-gray-600">
                          成功: {stat.successCount} 次 · 失败: {stat.failedCount} 次
                        </div>
                      </div>
                    </div>

                    {/* 统计信息 */}
                    {stat.successCount > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-white rounded">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">首Token</div>
                          <div className="text-sm font-medium">
                            {stat.stats.ttfb ? (
                              <>
                                均值: {Math.round(stat.stats.ttfb.avg)}ms<br/>
                                最快: {Math.round(stat.stats.ttfb.min)}ms<br/>
                                最慢: {Math.round(stat.stats.ttfb.max)}ms
                              </>
                            ) : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">总耗时</div>
                          <div className="text-sm font-medium">
                            {stat.stats.totalTime ? (
                              <>
                                均值: {Math.round(stat.stats.totalTime.avg)}ms<br/>
                                最快: {Math.round(stat.stats.totalTime.min)}ms<br/>
                                最慢: {Math.round(stat.stats.totalTime.max)}ms
                              </>
                            ) : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">成本</div>
                          <div className="text-sm font-medium">
                            {stat.stats.cost ? (
                              <>
                                均值: ${stat.stats.cost.avg.toFixed(4)}<br/>
                                总计: ${stat.stats.cost.sum.toFixed(4)}
                              </>
                            ) : '-'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 展开/折叠按钮 */}
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isExpanded ? '▼ 收起明细' : '▶ 展开明细'} ({stat.results.length} 次)
                    </button>

                    {/* 明细列表 */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {stat.results.map((result, idx) => (
                          <div key={result.id} className="flex items-center gap-4 p-3 bg-white rounded border">
                            <div className="text-sm font-medium text-gray-500 w-16">
                              第 {idx + 1} 次
                            </div>
                            <div className="flex-1">
                              {result.status === 'SUCCESS' ? (
                                <div className="text-sm text-gray-600">
                                  首token: {result.ttfb != null ? `${result.ttfb}ms` : '-'} |
                                  总耗时: {result.totalTime != null ? `${result.totalTime}ms` : '-'} |
                                  成本: ${result.cost ? Number(result.cost).toFixed(4) : '0.0000'}
                                </div>
                              ) : (
                                <div className="text-sm text-red-600">{result.error}</div>
                              )}
                            </div>
                            {result.audioUrl && (
                              <audio controls className="h-10">
                                <source src={result.audioUrl} type="audio/mpeg" />
                              </audio>
                            )}
                            <button
                              onClick={() => handleMarkAsBadCase(testCase, result)}
                              className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 whitespace-nowrap"
                              title="标注为 BadCase"
                            >
                              标注 BadCase
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showBadCaseModal && selectedResult && (
        <BadCaseModal
          batch={batch}
          testCase={selectedResult.testCase}
          result={selectedResult.result}
          onClose={() => {
            setShowBadCaseModal(false);
            setSelectedResult(null);
          }}
          onSuccess={() => {
            setShowBadCaseModal(false);
            setSelectedResult(null);
            alert('BadCase 标注成功！');
          }}
        />
      )}
    </>
  );
}

function SettingsTab({ batch, onUpdate }: { batch: BatchTest; onUpdate: () => void }) {
  const [config, setConfig] = useState(batch.config || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/batch-test/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        alert('保存成功');
        onUpdate();
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            语速
          </label>
          <input
            type="number"
            min="0.5"
            max="2"
            step="0.1"
            value={config.speed || 1.0}
            onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            失败重试次数
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={config.retryCount || 1}
            onChange={(e) => setConfig({ ...config, retryCount: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

function ImportModal({
  batchId,
  onClose,
  onSuccess,
}: {
  batchId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [data, setData] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      setImporting(true);
      const response = await fetch(`/api/batch-test/${batchId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, data }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`成功导入 ${result.data.imported} 个用例`);
        onSuccess();
      } else {
        alert('导入失败: ' + result.error);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">导入测试用例</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">格式</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">数据</label>
          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
            rows={12}
            placeholder={
              format === 'json'
                ? '[{"text": "你好", "tags": ["问候"]}]'
                : 'text,category,expectedVoice,tags\n你好,客服,,问候'
            }
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={importing}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={importing}
          >
            {importing ? '导入中...' : '导入'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderModal({
  batchId,
  currentProviders,
  onClose,
  onSuccess,
}: {
  batchId: string;
  currentProviders: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProviders, setSelectedProviders] = useState<string[]>(currentProviders);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any>({});

  // 存储每个供应商的模型和音色选择
  const [providerSelections, setProviderSelections] = useState<Record<string, {
    ttsModel?: string;
    asrModel?: string;
    voice?: string;
  }>>({});

  // 加载所有供应商（包括系统预置）
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const { getAllProvidersWithSystem } = await import('@/lib/utils/config');
        const allProviders = await getAllProvidersWithSystem();
        const enabledProviders = allProviders.filter((p) => p.enabled);
        setAvailableProviders(enabledProviders);

        // 加载模板定义
        const { templates: templateDefs } = await import('@/lib/providers/generic/templates');
        setTemplates(templateDefs);

        // 初始化每个供应商的选择（使用已有的选择或默认值）
        const initialSelections: Record<string, any> = {};
        enabledProviders.forEach((provider) => {
          initialSelections[provider.id] = {
            ttsModel: provider.selectedModels?.tts,
            asrModel: provider.selectedModels?.asr,
            voice: provider.selectedVoice,
          };
        });
        setProviderSelections(initialSelections);
      } catch (error) {
        console.error('加载供应商失败:', error);
        // 降级到只使用用户自定义供应商
        const config = getConfig();
        setAvailableProviders(config.providers.filter((p) => p.enabled));
      } finally {
        setLoading(false);
      }
    };
    loadProviders();
  }, []);

  const handleToggle = (providerId: string) => {
    if (selectedProviders.includes(providerId)) {
      setSelectedProviders(selectedProviders.filter((id) => id !== providerId));
    } else {
      setSelectedProviders([...selectedProviders, providerId]);
    }
  };

  // 处理模型选择变化
  const handleModelChange = (providerId: string, modelType: 'tts' | 'asr', modelId: string) => {
    setProviderSelections({
      ...providerSelections,
      [providerId]: {
        ...providerSelections[providerId],
        [modelType === 'tts' ? 'ttsModel' : 'asrModel']: modelId,
      },
    });
  };

  // 处理音色选择变化
  const handleVoiceChange = (providerId: string, voiceId: string) => {
    setProviderSelections({
      ...providerSelections,
      [providerId]: {
        ...providerSelections[providerId],
        voice: voiceId,
      },
    });
  };

  // 获取供应商的可用模型
  const getProviderModels = (provider: any) => {
    if (!provider.templateType || !templates[provider.templateType]) {
      return { ttsModels: [], asrModels: [] };
    }

    const template = templates[provider.templateType];
    const models = template.models || [];

    return {
      ttsModels: models.filter((m: any) => m.type === 'tts'),
      asrModels: models.filter((m: any) => m.type === 'asr'),
    };
  };

  // 获取选中TTS模型的音色列表
  const getVoicesForModel = (provider: any, ttsModelId?: string) => {
    if (!ttsModelId || !provider.templateType || !templates[provider.templateType]) {
      return [];
    }

    const template = templates[provider.templateType];
    const models = template.models || [];
    const ttsModel = models.find((m: any) => m.id === ttsModelId && m.type === 'tts');

    return ttsModel?.voices || [];
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 构建供应商配置映射
      const providerConfigs: Record<string, any> = {};
      selectedProviders.forEach((providerId) => {
        const provider = availableProviders.find((p) => p.id === providerId);
        if (provider) {
          // 合并供应商配置和用户选择的模型/音色
          const selection = providerSelections[providerId] || {};
          providerConfigs[providerId] = {
            ...provider,
            selectedModels: {
              tts: selection.ttsModel || provider.selectedModels?.tts,
              asr: selection.asrModel || provider.selectedModels?.asr,
            },
            selectedVoice: selection.voice || provider.selectedVoice,
          };
        }
      });

      // 保存供应商列表和配置
      const response = await fetch(`/api/batch-test/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: selectedProviders,
          config: {
            providerConfigs, // 保存供应商的完整配置
          },
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">选择供应商和模型</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">加载供应商列表...</div>
          </div>
        ) : availableProviders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">还没有配置供应商</p>
            <Link href="/settings">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                前往设置
              </button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
              {availableProviders.map((provider) => {
                const { ttsModels, asrModels } = getProviderModels(provider);
                const selection = providerSelections[provider.id] || {};
                const selectedTtsModel = selection.ttsModel || provider.selectedModels?.tts;
                const selectedAsrModel = selection.asrModel || provider.selectedModels?.asr;
                const selectedVoice = selection.voice || provider.selectedVoice;
                const voices = getVoicesForModel(provider, selectedTtsModel);

                return (
                  <div
                    key={provider.id}
                    className={`border rounded-lg p-4 ${
                      selectedProviders.includes(provider.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider.id)}
                        onChange={() => handleToggle(provider.id)}
                        className="w-5 h-5 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-1">{provider.name}</div>
                        <div className="text-sm text-gray-600 mb-3">{provider.templateType}</div>

                        {/* 模型选择 */}
                        {selectedProviders.includes(provider.id) && (
                          <div className="space-y-3 mt-3">
                            {/* TTS模型选择 */}
                            {ttsModels.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  TTS模型
                                </label>
                                <select
                                  value={selectedTtsModel || ''}
                                  onChange={(e) => handleModelChange(provider.id, 'tts', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">请选择模型</option>
                                  {ttsModels.map((model: any) => (
                                    <option key={model.id} value={model.id}>
                                      {model.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* 音色选择 */}
                            {voices.length > 0 && selectedTtsModel && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  音色
                                </label>
                                <select
                                  value={selectedVoice || ''}
                                  onChange={(e) => handleVoiceChange(provider.id, e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">请选择音色</option>
                                  {voices.map((voice: any) => (
                                    <option key={voice.id} value={voice.id}>
                                      {voice.name} {voice.description && `- ${voice.description}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* ASR模型选择 */}
                            {asrModels.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  ASR模型
                                </label>
                                <select
                                  value={selectedAsrModel || ''}
                                  onChange={(e) => handleModelChange(provider.id, 'asr', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">请选择模型</option>
                                  {asrModels.map((model: any) => (
                                    <option key={model.id} value={model.id}>
                                      {model.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || selectedProviders.length === 0}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BadCaseModal({
  batch,
  testCase,
  result,
  onClose,
  onSuccess,
}: {
  batch: BatchTest;
  testCase: TestCase;
  result: TestResult;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<keyof typeof BadCaseCategory>('OTHER');
  const [severity, setSeverity] = useState<BadCaseSeverity>(BadCaseSeverity.MINOR);
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [tags, setTags] = useState<string[]>(testCase.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState(3);
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      // 创建 BadCase
      createBadCase({
        text: testCase.text,
        category,
        severity,
        status: BadCaseStatus.OPEN,
        description,
        expectedBehavior,
        actualBehavior,
        audioUrls: result.audioUrl ? { [result.provider]: result.audioUrl } : {},
        priority,
        tags,
      });

      onSuccess();
    } catch (error) {
      console.error('创建 BadCase 失败:', error);
      alert('创建 BadCase 失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">标注 BadCase</h2>

        <div className="space-y-4">
          {/* 测试文本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">测试文本</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">{testCase.text}</div>
          </div>

          {/* 供应商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">供应商</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">
              {(() => {
                const batchConfig = batch.config as any;
                const providerConfigs = batchConfig?.providerConfigs || {};
                const providerConfig = providerConfigs[result.provider];
                return providerConfig?.name || result.provider;
              })()}
            </div>
          </div>

          {/* 音频播放 */}
          {result.audioUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">音频</label>
              <audio controls className="w-full">
                <source src={result.audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">问题分类 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as keyof typeof BadCaseCategory)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              {Object.entries(BadCaseCategory).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* 严重程度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">严重程度 *</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BadCaseSeverity)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value={BadCaseSeverity.MINOR}>次要</option>
              <option value={BadCaseSeverity.MAJOR}>重要</option>
              <option value={BadCaseSeverity.CRITICAL}>严重</option>
            </select>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              优先级 (1-5): {priority}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 问题描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">问题描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="描述发现的问题..."
            />
          </div>

          {/* 期望行为 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">期望行为</label>
            <textarea
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={2}
              placeholder="描述期望的正确行为..."
            />
          </div>

          {/* 实际行为 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">实际行为</label>
            <textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={2}
              placeholder="描述实际发生的行为..."
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-4 py-2 border rounded-lg"
                placeholder="输入标签后按回车添加"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                添加
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? '保存中...' : '创建 BadCase'}
          </button>
        </div>
      </div>
    </div>
  );
}
