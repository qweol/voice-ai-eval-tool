'use client';

import { useState, useEffect } from 'react';
import { APITemplate, TemplateType, ModelDefinition, VoiceDefinition } from '@/lib/providers/generic/types';
import {
  getAllTemplates,
  getBuiltinTemplates,
  getCustomTemplates,
  addUserTemplate,
  updateUserTemplate,
  removeUserTemplate,
  importTemplates,
  exportTemplates,
} from '@/lib/providers/generic/template-loader';

export default function TemplateManager() {
  const [allTemplates, setAllTemplates] = useState<APITemplate[]>([]);
  const [builtinTemplates, setBuiltinTemplates] = useState<APITemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<APITemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const [all, builtin, custom] = await Promise.all([
        getAllTemplates(),
        getBuiltinTemplates(),
        getCustomTemplates(),
      ]);
      setAllTemplates(all);
      setBuiltinTemplates(builtin);
      setCustomTemplates(custom);
    } catch (error) {
      console.error('加载模板失败:', error);
      showMessage('error', '加载模板失败');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async () => {
    try {
      const exported = await exportTemplates();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-ai-templates-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', '模板已导出');
    } catch (error: any) {
      showMessage('error', `导出失败: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      showMessage('error', '请输入要导入的模板JSON');
      return;
    }

    setLoading(true);
    try {
      const imported = await importTemplates(importText);
      await loadTemplates();
      showMessage('success', `成功导入 ${imported.length} 个模板`);
      setImportText('');
      setShowImport(false);
    } catch (error: any) {
      showMessage('error', `导入失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: TemplateType) => {
    if (!confirm(`确定要删除模板 "${templateId}" 吗？`)) {
      return;
    }

    try {
      await removeUserTemplate(templateId);
      await loadTemplates();
      showMessage('success', '模板已删除');
    } catch (error: any) {
      showMessage('error', `删除失败: ${error.message}`);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        setImportText(text);
      } catch (error: any) {
        showMessage('error', `读取文件失败: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">模板管理</h2>
        <button
          onClick={() => setShowImport(!showImport)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          📥 导入模板
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 导入表单 */}
      {showImport && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">导入模板</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                从文件导入
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                或粘贴JSON
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='[{"id": "kimi", "name": "Kimi", ...}]'
                className="w-full border border-gray-300 rounded-lg p-3 h-32 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={loading || !importText.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '导入中...' : '确认导入'}
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户自定义模板列表 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">自定义模板</h3>
        {customTemplates.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无自定义模板，可以导入或创建新模板</p>
        ) : (
          <div className="space-y-2">
            {customTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{template.name}</span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      自定义
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {template.id}</p>
                  {template.author && (
                    <p className="text-xs text-gray-500">作者: {template.author}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="ml-4 text-red-600 hover:text-red-800 text-sm font-semibold"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

