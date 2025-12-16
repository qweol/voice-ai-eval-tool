'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  queryBadCases,
  deleteBadCase,
  deleteBadCases,
  batchUpdateBadCaseStatus,
  getBadCaseStats,
} from '@/lib/utils/config';
import {
  BadCase,
  BadCaseStatus,
  BadCaseSeverity,
  BadCaseCategory,
} from '@/lib/types';

export default function BadCasesPage() {
  const [badCases, setBadCases] = useState<BadCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<any>(null);

  // 筛选条件
  const [filters, setFilters] = useState({
    status: '' as BadCaseStatus | '',
    category: '' as keyof typeof BadCaseCategory | '',
    severity: '' as BadCaseSeverity | '',
    search: '',
    sortBy: 'createdAt' as 'createdAt' | 'updatedAt' | 'priority',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // 加载数据
  const loadData = () => {
    const queryOptions: any = {
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    if (filters.status) queryOptions.status = filters.status;
    if (filters.category) queryOptions.category = filters.category;
    if (filters.severity) queryOptions.severity = filters.severity;
    if (filters.search) queryOptions.search = filters.search;

    const results = queryBadCases(queryOptions);
    setBadCases(results);
    setStats(getBadCaseStats());
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === badCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(badCases.map(bc => bc.id)));
    }
  };

  // 切换单个选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 删除单个
  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个 BadCase 吗？')) {
      deleteBadCase(id);
      loadData();
      setSelectedIds(new Set());
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的 BadCase');
      return;
    }

    if (confirm(`确定要删除选中的 ${selectedIds.size} 个 BadCase 吗？`)) {
      deleteBadCases(Array.from(selectedIds));
      loadData();
      setSelectedIds(new Set());
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = (status: BadCaseStatus) => {
    if (selectedIds.size === 0) {
      alert('请先选择要更新的 BadCase');
      return;
    }

    batchUpdateBadCaseStatus(Array.from(selectedIds), status);
    loadData();
    setSelectedIds(new Set());
  };

  // 严重程度颜色
  const getSeverityColor = (severity: BadCaseSeverity) => {
    switch (severity) {
      case BadCaseSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-300';
      case BadCaseSeverity.MAJOR:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case BadCaseSeverity.MINOR:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 状态颜色
  const getStatusColor = (status: BadCaseStatus) => {
    switch (status) {
      case BadCaseStatus.OPEN:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case BadCaseStatus.CONFIRMED:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case BadCaseStatus.FIXED:
        return 'bg-green-100 text-green-800 border-green-300';
      case BadCaseStatus.WONTFIX:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 状态中文名
  const getStatusLabel = (status: BadCaseStatus) => {
    const labels = {
      [BadCaseStatus.OPEN]: '待处理',
      [BadCaseStatus.CONFIRMED]: '已确认',
      [BadCaseStatus.FIXED]: '已修复',
      [BadCaseStatus.WONTFIX]: '不修复',
    };
    return labels[status] || status;
  };

  // 严重程度中文名
  const getSeverityLabel = (severity: BadCaseSeverity) => {
    const labels = {
      [BadCaseSeverity.CRITICAL]: '严重',
      [BadCaseSeverity.MAJOR]: '重要',
      [BadCaseSeverity.MINOR]: '次要',
    };
    return labels[severity] || severity;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BadCase 管理</h1>
            <p className="text-gray-600 mt-2">
              管理和追踪 TTS 测试中发现的问题用例
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/badcases/stats"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              📊 统计分析
            </Link>
            <Link
              href="/tts"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 从 TTS 测试创建
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">总数</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">待处理</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.byStatus[BadCaseStatus.OPEN]}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">已确认</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.byStatus[BadCaseStatus.CONFIRMED]}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">已修复</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus[BadCaseStatus.FIXED]}
              </div>
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* 搜索 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索
              </label>
              <input
                type="text"
                placeholder="搜索文本内容、描述或标签..."
                value={filters.search}
                onChange={e =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={filters.status}
                onChange={e =>
                  setFilters({
                    ...filters,
                    status: e.target.value as BadCaseStatus | '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value={BadCaseStatus.OPEN}>待处理</option>
                <option value={BadCaseStatus.CONFIRMED}>已确认</option>
                <option value={BadCaseStatus.FIXED}>已修复</option>
                <option value={BadCaseStatus.WONTFIX}>不修复</option>
              </select>
            </div>

            {/* 分类筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <select
                value={filters.category}
                onChange={e =>
                  setFilters({
                    ...filters,
                    category: e.target.value as keyof typeof BadCaseCategory | '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                {Object.entries(BadCaseCategory).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 严重程度筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                严重程度
              </label>
              <select
                value={filters.severity}
                onChange={e =>
                  setFilters({
                    ...filters,
                    severity: e.target.value as BadCaseSeverity | '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value={BadCaseSeverity.CRITICAL}>严重</option>
                <option value={BadCaseSeverity.MAJOR}>重要</option>
                <option value={BadCaseSeverity.MINOR}>次要</option>
              </select>
            </div>

            {/* 排序字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序字段
              </label>
              <select
                value={filters.sortBy}
                onChange={e =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as 'createdAt' | 'updatedAt' | 'priority',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">创建时间</option>
                <option value="updatedAt">更新时间</option>
                <option value="priority">优先级</option>
              </select>
            </div>

            {/* 排序方向 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方向
              </label>
              <select
                value={filters.sortOrder}
                onChange={e =>
                  setFilters({
                    ...filters,
                    sortOrder: e.target.value as 'asc' | 'desc',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-center justify-between">
            <div className="text-blue-900">
              已选择 <span className="font-bold">{selectedIds.size}</span> 个 BadCase
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchUpdateStatus(BadCaseStatus.CONFIRMED)}
                className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                标记为已确认
              </button>
              <button
                onClick={() => handleBatchUpdateStatus(BadCaseStatus.FIXED)}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                标记为已修复
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                批量删除
              </button>
            </div>
          </div>
        )}

        {/* BadCase 列表 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {badCases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-lg">暂无 BadCase</div>
              <div className="text-sm mt-2">
                在 TTS 测试页面标记问题用例，或手动创建
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === badCases.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    文本内容
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    分类
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    严重程度
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    优先级
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {badCases.map(bc => (
                  <tr
                    key={bc.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(bc.id)}
                        onChange={() => toggleSelect(bc.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/badcases/${bc.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {bc.text.length > 50
                          ? bc.text.substring(0, 50) + '...'
                          : bc.text}
                      </Link>
                      {bc.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {bc.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {bc.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{bc.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {BadCaseCategory[bc.category]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(
                          bc.severity
                        )}`}
                      >
                        {getSeverityLabel(bc.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                          bc.status
                        )}`}
                      >
                        {getStatusLabel(bc.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {bc.priority}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(bc.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/badcases/${bc.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          查看
                        </Link>
                        <button
                          onClick={() => handleDelete(bc.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
