'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBadCaseStats, queryBadCases } from '@/lib/utils/config';
import { BadCaseStats, BadCaseStatus, BadCaseSeverity, BadCaseCategory } from '@/lib/types';

export default function BadCaseStatsPage() {
  const [stats, setStats] = useState<BadCaseStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const data = getBadCaseStats();
    setStats(data);
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">加载中...</div>
        </div>
      </div>
    );
  }

  // 计算百分比
  const getPercentage = (value: number, total: number): string => {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href="/badcases"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← 返回列表
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">BadCase 统计分析</h1>
            <p className="text-gray-600 mt-2">
              全面了解 BadCase 的分布和趋势
            </p>
          </div>
        </div>

        {/* 总览卡片 */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">总 BadCase 数</div>
            <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">待处理</div>
            <div className="text-4xl font-bold text-blue-600">
              {stats.byStatus[BadCaseStatus.OPEN]}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {getPercentage(stats.byStatus[BadCaseStatus.OPEN], stats.total)}%
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">已确认</div>
            <div className="text-4xl font-bold text-purple-600">
              {stats.byStatus[BadCaseStatus.CONFIRMED]}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {getPercentage(stats.byStatus[BadCaseStatus.CONFIRMED], stats.total)}%
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">已修复</div>
            <div className="text-4xl font-bold text-green-600">
              {stats.byStatus[BadCaseStatus.FIXED]}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {getPercentage(stats.byStatus[BadCaseStatus.FIXED], stats.total)}%
            </div>
          </div>
        </div>

        {/* 按状态分布 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">按状态分布</h2>
          <div className="space-y-4">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const statusLabels = {
                [BadCaseStatus.OPEN]: { label: '待处理', color: 'bg-blue-500' },
                [BadCaseStatus.CONFIRMED]: { label: '已确认', color: 'bg-purple-500' },
                [BadCaseStatus.FIXED]: { label: '已修复', color: 'bg-green-500' },
                [BadCaseStatus.WONTFIX]: { label: '不修复', color: 'bg-gray-500' },
              };

              const info = statusLabels[status as BadCaseStatus];
              const percentage = getPercentage(count, stats.total);

              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {info.label}
                    </span>
                    <span className="text-sm text-gray-600">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${info.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按分类分布 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">按分类分布</h2>
          {Object.keys(stats.byCategory).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => {
                  const percentage = getPercentage(count, stats.total);
                  return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{category}</div>
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">暂无数据</div>
          )}
        </div>

        {/* 按严重程度分布 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">按严重程度分布</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                key: BadCaseSeverity.CRITICAL,
                label: '严重',
                color: 'bg-red-500',
                bgColor: 'bg-red-50',
                textColor: 'text-red-900',
              },
              {
                key: BadCaseSeverity.MAJOR,
                label: '重要',
                color: 'bg-orange-500',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-900',
              },
              {
                key: BadCaseSeverity.MINOR,
                label: '次要',
                color: 'bg-yellow-500',
                bgColor: 'bg-yellow-50',
                textColor: 'text-yellow-900',
              },
            ].map(({ key, label, color, bgColor, textColor }) => {
              const count = stats.bySeverity[key];
              const percentage = getPercentage(count, stats.total);

              return (
                <div
                  key={key}
                  className={`${bgColor} border border-gray-200 rounded-lg p-6`}
                >
                  <div className={`text-sm font-medium ${textColor} mb-2`}>
                    {label}
                  </div>
                  <div className={`text-4xl font-bold ${textColor} mb-3`}>
                    {count}
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div
                      className={`${color} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-2">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按供应商分布 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">按供应商分布</h2>
          {Object.keys(stats.byProvider).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.byProvider)
                .sort(([, a], [, b]) => b - a)
                .map(([provider, count]) => {
                  const percentage = getPercentage(count, stats.total);
                  return (
                    <div key={provider} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-gray-700 truncate">
                        {provider}
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-6 relative">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          >
                            {parseFloat(percentage) > 10 && (
                              <span className="text-xs font-medium text-white">
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm text-gray-600">
                        {count} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">暂无数据</div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/badcases"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看所有 BadCase
          </Link>
          <Link
            href="/badcases?status=open"
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            查看待处理
          </Link>
        </div>
      </div>
    </div>
  );
}
