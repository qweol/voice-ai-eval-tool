import { useState, useEffect } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface AsrSample {
  id: string;
  name: string;
  description?: string;
  filename: string;
  originalName: string;
  fileSize: number;
  duration?: number;
  format: string;
  tags: string[];
  language: string;
  referenceText?: string;
  usageCount: number;
  createdAt: string;
}

interface SampleLibraryProps {
  onSelectSample: (sample: AsrSample) => void;
  refreshTrigger?: number;
}

export default function SampleLibrary({ onSelectSample, refreshTrigger }: SampleLibraryProps) {
  const [samples, setSamples] = useState<AsrSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [language, setLanguage] = useState('all');
  const [search, setSearch] = useState('');

  // 加载样本列表
  const loadSamples = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (language !== 'all') params.append('language', language);
      if (search) params.append('search', search);

      const res = await fetch(`/api/asr/samples?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSamples(data.data);
      }
    } catch (error) {
      console.error('加载样本列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时自动加载样本
  useEffect(() => {
    loadSamples();
  }, [refreshTrigger]);

  // 删除样本
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个样本吗？')) return;

    try {
      const res = await fetch(`/api/asr/samples/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSamples(samples.filter(s => s.id !== id));
        alert('样本已删除');
      }
    } catch (error) {
      console.error('删除样本失败:', error);
      alert('删除失败');
    }
  };

  // 选择样本
  const handleSelect = (sample: AsrSample) => {
    setSelectedSample(sample.id);
    onSelectSample(sample);
  };

  return (
    <div>
      {/* 筛选和搜索 */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="搜索样本名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border-2 border-border rounded-lg px-4 py-2 bg-input text-foreground focus:outline-none focus:border-accent"
        >
          <option value="all">全部语言</option>
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="zh-en">中英混合</option>
        </select>
        <Button onClick={loadSamples} showArrow={false}>
          {loading ? '加载中...' : '搜索'}
        </Button>
      </div>

      {/* 样本列表 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent"></div>
        </div>
      ) : samples.length === 0 ? (
        <Card hover={false}>
          <p className="text-center text-mutedForeground py-8">
            暂无样本，请先上传音频文件
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelect(sample)}
              className="cursor-pointer"
            >
              <Card
                featured={selectedSample === sample.id}
                hover={true}
              >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-1">{sample.name}</h3>
                  <p className="text-sm text-mutedForeground">
                    {sample.duration ? `${Number(sample.duration).toFixed(1)}s` : '-'} | {sample.format.toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const audio = new Audio(`/api/storage/audio/${sample.filename}`);
                      audio.play();
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="播放"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sample.id);
                    }}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {sample.description && (
                <p className="text-sm text-mutedForeground mb-2">{sample.description}</p>
              )}

              {sample.tags && sample.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {sample.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-accent text-accentForeground rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-xs text-mutedForeground">
                使用次数: {sample.usageCount}
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
