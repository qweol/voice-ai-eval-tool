// ASR 相关类型
export interface ASRResult {
  text: string;
  duration: number;
  confidence?: number;
}

export interface ASROptions {
  language?: string;
  format?: string;
}

// TTS 相关类型
export interface TTSResult {
  audioBuffer: Buffer;
  duration: number; // 供应商 API 调用耗时（秒，不含后处理）
  ttfb?: number | null; // 首个音频块耗时，毫秒
  totalTime?: number; // 供应商 API 调用耗时（毫秒，不含后处理）
  format?: string;
}

export interface TTSOptions {
  voice?: string; // 音色类型，具体值取决于供应商
  speed?: number; // 语速，0.5-2.0 之间
  language?: string; // 语言代码，例如：'zh' | 'en' | 'ja' 等
}

// 供应商适配器接口
export interface ASRAdapter {
  recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult>;
}

export interface TTSAdapter {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}

// ============================================
// BadCase 管理相关类型
// ============================================

export enum BadCaseCategory {
  PRONUNCIATION = '发音错误',
  RHYTHM = '韵律问题',
  EMOTION = '情感表达',
  SPECIAL_CHAR = '特殊字符',
  TRUNCATION = '截断问题',
  NOISE = '噪音杂音',
  OTHER = '其他'
}

export enum BadCaseSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor'
}

export enum BadCaseStatus {
  OPEN = 'open',
  CONFIRMED = 'confirmed',
  FIXED = 'fixed',
  WONTFIX = 'wontfix'
}

export interface BadCase {
  id: string;
  text: string;
  category: keyof typeof BadCaseCategory;
  severity: BadCaseSeverity;
  status: BadCaseStatus;

  description?: string;
  expectedBehavior?: string;
  actualBehavior?: string;

  // 音频关联 (providerId -> audioUrl)
  audioUrls: Record<string, string>;
  referenceAudioUrl?: string;

  priority: number; // 1-5
  tags: string[];

  createdBy: string;
  createdAt: string; // ISO 8601 格式
  updatedAt: string;

  // 简化版验证历史（只保存最后一次）
  lastVerification?: VerificationRecord;
}

export interface VerificationRecord {
  id: string;
  providerId: string;
  status: 'pass' | 'fail';
  audioUrl?: string;
  notes?: string;
  verifiedBy: string;
  verifiedAt: string;
}

// BadCase 列表查询参数
export interface BadCaseListQuery {
  status?: BadCaseStatus;
  category?: keyof typeof BadCaseCategory;
  severity?: BadCaseSeverity;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// BadCase 统计数据
export interface BadCaseStats {
  total: number;
  byStatus: Record<BadCaseStatus, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<BadCaseSeverity, number>;
  byProvider: Record<string, number>;
}
