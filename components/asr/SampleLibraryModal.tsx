import { useState } from 'react';
import { X } from 'lucide-react';
import SampleLibrary, { AsrSample } from './SampleLibrary';
import BatchUpload from './BatchUpload';

interface SampleLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: AsrSample) => void;
}

export default function SampleLibraryModal({ isOpen, onClose, onSelectSample }: SampleLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isOpen) return null;

  const handleSelectSample = (sample: AsrSample) => {
    onSelectSample(sample);
    onClose();
  };

  const handleUploadComplete = () => {
    setActiveTab('library');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <h2 className="text-3xl font-heading font-bold text-foreground">样本库管理</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 px-6 pt-4 border-b-2 border-border">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 font-bold transition-all ${
              activeTab === 'library'
                ? 'text-accent border-b-4 border-accent -mb-0.5'
                : 'text-mutedForeground hover:text-foreground'
            }`}
          >
            样本库
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold transition-all ${
              activeTab === 'upload'
                ? 'text-accent border-b-4 border-accent -mb-0.5'
                : 'text-mutedForeground hover:text-foreground'
            }`}
          >
            上传样本
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            <SampleLibrary onSelectSample={handleSelectSample} refreshTrigger={refreshTrigger} />
          ) : (
            <BatchUpload onUploadComplete={handleUploadComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
