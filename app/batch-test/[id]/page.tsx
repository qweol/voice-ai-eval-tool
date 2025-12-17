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
  cost?: number;
  error?: string;
  userRating?: any;
}

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

    if (!confirm(`确定要执行测试吗？\n\n将测试 ${batch.testCases.length} 个用例 × ${batch.providers.length} 个供应商 = ${batch.testCases.length * batch.providers.length} 次调用`)) {
      return;
    }

    try {
      setExecuting(true);
      const response = await fetch(`/api/batch-test/${batchId}/execute`, {
        method: 'POST',
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
          <div className="flex gap-4">
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
  if (batch.testCases.length === 0) {
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
              {testCase.tags.length > 0 && (
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

  if (batch.results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">还没有测试结果</h3>
        <p className="text-gray-600">执行测试后查看结果</p>
      </div>
    );
  }

  const resultsByCase = batch.testCases.map((testCase) => ({
    testCase,
    results: batch.results.filter((r) => r.testCaseId === testCase.id),
  }));

  const handleMarkAsBadCase = (testCase: TestCase, result: TestResult) => {
    setSelectedResult({ testCase, result });
    setShowBadCaseModal(true);
  };

  return (
    <>
      <div className="space-y-6">
        {resultsByCase.map(({ testCase, results }) => (
          <div key={testCase.id} className="border rounded-lg p-4">
            <div className="font-medium text-gray-800 mb-4">{testCase.text}</div>
            <div className="grid gap-4">
              {results.map((result) => (
                <div key={result.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-gray-700">{result.provider}</div>
                    {result.status === 'SUCCESS' ? (
                      <div className="text-sm text-gray-600">
                        耗时: {result.duration ? Number(result.duration).toFixed(2) : '0.00'}s | 成本: ${result.cost ? Number(result.cost).toFixed(4) : '0.0000'}
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
          </div>
        ))}
      </div>

      {showBadCaseModal && selectedResult && (
        <BadCaseModal
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

  // 加载所有供应商（包括系统预置）
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const { getAllProvidersWithSystem } = await import('@/lib/utils/config');
        const allProviders = await getAllProvidersWithSystem();
        setAvailableProviders(allProviders.filter((p) => p.enabled));
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

  const handleSave = async () => {
    try {
      setSaving(true);

      // 构建供应商配置映射
      const providerConfigs: Record<string, any> = {};
      selectedProviders.forEach((providerId) => {
        const provider = availableProviders.find((p) => p.id === providerId);
        if (provider) {
          providerConfigs[providerId] = provider;
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
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">选择供应商</h2>

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
            <div className="space-y-3 mb-6">
              {availableProviders.map((provider) => (
                <label
                  key={provider.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes(provider.id)}
                    onChange={() => handleToggle(provider.id)}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{provider.name}</div>
                    <div className="text-sm text-gray-600">{provider.templateType}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
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
  testCase,
  result,
  onClose,
  onSuccess,
}: {
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
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">{result.provider}</div>
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
