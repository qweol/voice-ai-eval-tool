import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface FileWithMetadata {
  file: File;
  name: string;
  description: string;
  language: string;
  tags: string[];
  referenceText: string;
}

interface BatchUploadProps {
  onUploadComplete: () => void;
}

export default function BatchUpload({ onUploadComplete }: BatchUploadProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // 处理文件选择
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithMetadata[] = Array.from(selectedFiles).map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      language: 'zh',
      tags: [],
      referenceText: '',
    }));

    setFiles([...files, ...newFiles]);
  };

  // 拖拽处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // 移除文件
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 更新文件元数据
  const updateFile = (index: number, field: keyof FileWithMetadata, value: any) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], [field]: value };
    setFiles(newFiles);
  };

  // 批量上传
  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();

      files.forEach((fileData, index) => {
        formData.append('files', fileData.file);
        formData.append(`name_${index}`, fileData.name);
        formData.append(`description_${index}`, fileData.description);
        formData.append(`language_${index}`, fileData.language);
        formData.append(`tags_${index}`, JSON.stringify(fileData.tags));
        formData.append(`referenceText_${index}`, fileData.referenceText);
      });

      const res = await fetch('/api/asr/samples', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message || '上传成功');
        setFiles([]);
        onUploadComplete();
      } else {
        alert('上传失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* 文件上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
          dragActive ? 'border-accent bg-accent/10' : 'border-border'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-4 text-mutedForeground" size={48} />
        <p className="text-lg font-bold text-foreground mb-2">
          拖拽文件到这里，或点击选择文件
        </p>
        <p className="text-sm text-mutedForeground mb-4">
          支持 WAV, MP3, M4A, OGG 格式，最大 50MB
        </p>
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-3 bg-accent text-accentForeground font-bold rounded-lg border-2 border-foreground shadow-pop hover:bg-accent/90 cursor-pointer transition-all"
        >
          选择文件
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-bold">待上传文件 ({files.length})</h3>
          {files.map((fileData, index) => (
            <Card key={index} hover={false}>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {fileData.file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-1">样本名称</label>
                      <input
                        type="text"
                        value={fileData.name}
                        onChange={(e) => updateFile(index, 'name', e.target.value)}
                        className="w-full border-2 border-border rounded px-3 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">语言</label>
                      <select
                        value={fileData.language}
                        onChange={(e) => updateFile(index, 'language', e.target.value)}
                        className="w-full border-2 border-border rounded px-3 py-1 text-sm"
                      >
                        <option value="zh">中文</option>
                        <option value="en">英文</option>
                        <option value="zh-en">中英混合</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">描述（可选）</label>
                    <input
                      type="text"
                      value={fileData.description}
                      onChange={(e) => updateFile(index, 'description', e.target.value)}
                      className="w-full border-2 border-border rounded px-3 py-1 text-sm"
                      placeholder="简要描述这个音频样本..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">标签（可选，用逗号分隔）</label>
                    <input
                      type="text"
                      value={fileData.tags.join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                        updateFile(index, 'tags', tags);
                      }}
                      className="w-full border-2 border-border rounded px-3 py-1 text-sm"
                      placeholder="例如: 客服, 投诉, 普通话"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">参考文本（可选）</label>
                    <textarea
                      value={fileData.referenceText}
                      onChange={(e) => updateFile(index, 'referenceText', e.target.value)}
                      className="w-full border-2 border-border rounded px-3 py-1 text-sm"
                      rows={2}
                      placeholder="标准转写文本，用于对比识别准确率..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {files.length > 0 && (
        <div className="flex gap-4">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            showArrow={true}
          >
            {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
          </Button>
          <Button
            onClick={() => setFiles([])}
            disabled={uploading}
            showArrow={false}
          >
            清空列表
          </Button>
        </div>
      )}
    </div>
  );
}
