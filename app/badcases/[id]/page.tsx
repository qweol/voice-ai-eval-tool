'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getBadCase,
  updateBadCase,
  deleteBadCase,
} from '@/lib/utils/config';
import {
  BadCase,
  BadCaseStatus,
  BadCaseSeverity,
  BadCaseCategory,
  VerificationRecord,
} from '@/lib/types';

export default function BadCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [badCase, setBadCase] = useState<BadCase | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BadCase>>({});
  const [badCaseId, setBadCaseId] = useState<string | null>(null);

  useEffect(() => {
    // 解析异步 params
    params.then(p => {
      setBadCaseId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (badCaseId) {
      loadBadCase();
    }
  }, [badCaseId]);

  const loadBadCase = () => {
    if (!badCaseId) return;
    const bc = getBadCase(badCaseId);
    if (bc) {
      setBadCase(bc);
      setEditForm(bc);
    }
  };

  const handleSave = () => {
    if (!badCase) return;

    const updated = updateBadCase(badCase.id, editForm);
    if (updated) {
      setBadCase(updated);
      setIsEditing(false);
      alert('保存成功！');
    }
  };

  const handleDelete = () => {
    if (!badCase) return;

    if (confirm('确定要删除这个 BadCase 吗？此操作不可恢复。')) {
      deleteBadCase(badCase.id);
      router.push('/badcases');
    }
  };

  const handleAddVerification = () => {
    if (!badCase) return;

    const providerId = prompt('请输入供应商 ID:');
    if (!providerId) return;

    const status = confirm('验证通过？点击"确定"表示通过，"取消"表示失败');
    const notes = prompt('验证备注（可选）:');

    const verification: VerificationRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      providerId,
      status: status ? 'pass' : 'fail',
      notes: notes || undefined,
      verifiedBy: 'user',
      verifiedAt: new Date().toISOString(),
    };

    const updated = updateBadCase(badCase.id, {
      lastVerification: verification,
    });

    if (updated) {
      setBadCase(updated);
      alert('验证记录已添加！');
    }
  };

  if (!badCase) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
            <div className="text-4xl mb-4">❌</div>
            <div className="text-xl text-gray-900 mb-2">BadCase 不存在</div>
            <Link
              href="/badcases"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              返回列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/badcases"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 返回列表
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">BadCase 详情</h1>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(badCase);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  删除
                </button>
              </>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>

          <div className="space-y-4">
            {/* 文本内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文本内容
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.text || ''}
                  onChange={e =>
                    setEditForm({ ...editForm, text: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {badCase.text}
                </div>
              )}
            </div>

            {/* 分类、严重程度、状态 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                {isEditing ? (
                  <select
                    value={editForm.category || ''}
                    onChange={e =>
                      setEditForm({
                        ...editForm,
                        category: e.target.value as keyof typeof BadCaseCategory,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(BadCaseCategory).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-gray-900">
                    {BadCaseCategory[badCase.category]}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  严重程度
                </label>
                {isEditing ? (
                  <select
                    value={editForm.severity || ''}
                    onChange={e =>
                      setEditForm({
                        ...editForm,
                        severity: e.target.value as BadCaseSeverity,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={BadCaseSeverity.CRITICAL}>严重</option>
                    <option value={BadCaseSeverity.MAJOR}>重要</option>
                    <option value={BadCaseSeverity.MINOR}>次要</option>
                  </select>
                ) : (
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getSeverityColor(
                      badCase.severity
                    )}`}
                  >
                    {badCase.severity === BadCaseSeverity.CRITICAL && '严重'}
                    {badCase.severity === BadCaseSeverity.MAJOR && '重要'}
                    {badCase.severity === BadCaseSeverity.MINOR && '次要'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状态
                </label>
                {isEditing ? (
                  <select
                    value={editForm.status || ''}
                    onChange={e =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as BadCaseStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={BadCaseStatus.OPEN}>待处理</option>
                    <option value={BadCaseStatus.CONFIRMED}>已确认</option>
                    <option value={BadCaseStatus.FIXED}>已修复</option>
                    <option value={BadCaseStatus.WONTFIX}>不修复</option>
                  </select>
                ) : (
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusColor(
                      badCase.status
                    )}`}
                  >
                    {badCase.status === BadCaseStatus.OPEN && '待处理'}
                    {badCase.status === BadCaseStatus.CONFIRMED && '已确认'}
                    {badCase.status === BadCaseStatus.FIXED && '已修复'}
                    {badCase.status === BadCaseStatus.WONTFIX && '不修复'}
                  </span>
                )}
              </div>
            </div>

            {/* 优先级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级 (1-5)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editForm.priority || 3}
                  onChange={e =>
                    setEditForm({
                      ...editForm,
                      priority: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-gray-900">{badCase.priority}</div>
              )}
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="用逗号分隔多个标签"
                  value={editForm.tags?.join(', ') || ''}
                  onChange={e =>
                    setEditForm({
                      ...editForm,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {badCase.tags.length > 0 ? (
                    badCase.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">无标签</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 问题描述 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">问题描述</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问题描述
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.description || ''}
                  onChange={e =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  placeholder="详细描述发现的问题..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {badCase.description || '无'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期望表现
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.expectedBehavior || ''}
                  onChange={e =>
                    setEditForm({
                      ...editForm,
                      expectedBehavior: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="描述期望的正确表现..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {badCase.expectedBehavior || '无'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                实际表现
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.actualBehavior || ''}
                  onChange={e =>
                    setEditForm({ ...editForm, actualBehavior: e.target.value })
                  }
                  rows={2}
                  placeholder="描述实际的错误表现..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {badCase.actualBehavior || '无'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 音频对比 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">音频对比</h2>

          {Object.keys(badCase.audioUrls).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(badCase.audioUrls).map(([providerId, audioUrl]) => (
                <div
                  key={providerId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="font-medium text-gray-900 mb-2">
                    {providerId}
                  </div>
                  <audio controls className="w-full">
                    <source src={audioUrl} type="audio/mpeg" />
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🔇</div>
              <div>暂无关联音频</div>
            </div>
          )}
        </div>

        {/* 验证历史（简化版） */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最后验证记录</h2>
            <button
              onClick={handleAddVerification}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + 添加验证
            </button>
          </div>

          {badCase.lastVerification ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900">
                    {badCase.lastVerification.providerId}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(
                      badCase.lastVerification.verifiedAt
                    ).toLocaleString('zh-CN')}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    badCase.lastVerification.status === 'pass'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {badCase.lastVerification.status === 'pass'
                    ? '✓ 通过'
                    : '✗ 失败'}
                </span>
              </div>
              {badCase.lastVerification.notes && (
                <div className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                  {badCase.lastVerification.notes}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                验证人: {badCase.lastVerification.verifiedBy}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <div>暂无验证记录</div>
            </div>
          )}
        </div>

        {/* 元数据 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">元数据</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">创建人:</span>
              <span className="ml-2 text-gray-900">{badCase.createdBy}</span>
            </div>
            <div>
              <span className="text-gray-600">创建时间:</span>
              <span className="ml-2 text-gray-900">
                {new Date(badCase.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">最后更新:</span>
              <span className="ml-2 text-gray-900">
                {new Date(badCase.updatedAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ID:</span>
              <span className="ml-2 text-gray-900 font-mono text-xs">
                {badCase.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
