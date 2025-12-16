'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BatchTest {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  providers: string[];
  totalCases: number;
  completedCases: number;
  failedCases: number;
  successRate?: number;
  avgDuration?: number;
  totalCost?: number;
  createdAt: string;
  completedAt?: string;
  _count?: {
    testCases: number;
    results: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  RUNNING: '运行中',
  COMPLETED: '已完成',
  FAILED: '失败',
  PAUSED: '已暂停',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
};

export default function BatchTestPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  useEffect(() => {
    loadBatches();
  }, [filterStatus, filterCategory]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`/api/batch-test?${params}`);
      const result = await response.json();

      if (result.success) {
        setBatches(result.data.batches);
      }
    } catch (error) {
      console.error('加载批次列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个批次吗？')) return;

    try {
      const response = await fetch(`/api/batch-test/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadBatches();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">批量测试</h1>
            <p className="text-gray-600 mt-2">系统性测试和历史对比</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                返回首页
              </button>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建批次
            </button>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                <option value="DRAFT">草稿</option>
                <option value="RUNNING">运行中</option>
                <option value="COMPLETED">已完成</option>
                <option value="FAILED">失败</option>
                <option value="PAUSED">已暂停</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                <option value="客服">客服</option>
                <option value="播报">播报</option>
                <option value="对话">对话</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>
        </div>

        {/* 批次列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : batches.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              还没有批量测试
            </h3>
            <p className="text-gray-600 mb-6">创建第一个批次开始测试</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建批次
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {batch.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          STATUS_COLORS[batch.status]
                        }`}
                      >
                        {STATUS_LABELS[batch.status]}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {batch.category}
                      </span>
                    </div>

                    {batch.description && (
                      <p className="text-gray-600 mb-3">{batch.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div>
                        用例数: <span className="font-semibold">{batch.totalCases}</span>
                      </div>
                      <div>
                        供应商: <span className="font-semibold">{batch.providers.length}</span>
                      </div>
                      {batch.status === 'COMPLETED' && (
                        <>
                          <div>
                            成功率:{' '}
                            <span className="font-semibold text-green-600">
                              {batch.successRate ? Number(batch.successRate).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                          <div>
                            平均耗时:{' '}
                            <span className="font-semibold">
                              {batch.avgDuration ? Number(batch.avgDuration).toFixed(2) : '0.00'}s
                            </span>
                          </div>
                          <div>
                            总成本:{' '}
                            <span className="font-semibold">
                              ${batch.totalCost ? Number(batch.totalCost).toFixed(4) : '0.0000'}
                            </span>
                          </div>
                        </>
                      )}
                      {batch.status === 'RUNNING' && (
                        <div>
                          进度:{' '}
                          <span className="font-semibold text-blue-600">
                            {batch.completedCases}/{batch.totalCases}
                          </span>
                        </div>
                      )}
                    </div>

                    {batch.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {batch.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-3">
                      创建时间: {new Date(batch.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link href={`/batch-test/${batch.id}`}>
                      <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        查看详情
                      </button>
                    </Link>
                    {batch.status === 'DRAFT' && (
                      <button
                        onClick={() => handleDelete(batch.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建批次模态框 */}
      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadBatches();
          }}
        />
      )}
    </div>
  );
}

function CreateBatchModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '客服',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/batch-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          providers: [],
          config: {},
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/batch-test/${result.data.id}`);
      } else {
        alert('创建失败: ' + result.error);
      }
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">创建批量测试</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              批次名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="例如：客服常用语-v1.0"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="批次描述..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类 *
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="客服">客服</option>
              <option value="播报">播报</option>
              <option value="对话">对话</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="用逗号分隔，例如：数字,专业术语"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
