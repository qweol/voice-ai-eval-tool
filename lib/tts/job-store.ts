export type TtsJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface TtsJobProgress {
  status: TtsJobStatus;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  startedAt?: string;
  completedAt?: string;
  current?: {
    provider?: string;
    runIndex?: number;
  };
  error?: string;
}

export interface TtsJobState extends TtsJobProgress {
  jobId: string;
  results: any[];
}

function clampInt(value: number, min: number, max: number): number {
  const v = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.max(min, Math.min(max, v));
}

function computePercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

function generateJobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// NOTE: 进程内存存储（和部署形态强相关）
// - 单实例：OK
// - 多实例/无状态：进度可能丢失或不一致
export const ttsJobs = new Map<string, TtsJobState>();

export function createTtsJob(params: { total: number }): TtsJobState {
  const jobId = generateJobId();
  const total = clampInt(params.total, 0, 1_000_000);
  const now = new Date().toISOString();
  const job: TtsJobState = {
    jobId,
    status: 'PENDING',
    total,
    completed: 0,
    failed: 0,
    percentage: 0,
    startedAt: now,
    results: [],
  };
  ttsJobs.set(jobId, job);
  return job;
}

export function getTtsJob(jobId: string): TtsJobState | null {
  return ttsJobs.get(jobId) || null;
}

export function updateTtsJob(jobId: string, patch: Partial<TtsJobProgress>): TtsJobState | null {
  const job = ttsJobs.get(jobId);
  if (!job) return null;

  const next: TtsJobState = {
    ...job,
    ...patch,
    // ensure numeric fields consistent
    total: typeof patch.total === 'number' ? patch.total : job.total,
    completed: typeof patch.completed === 'number' ? patch.completed : job.completed,
    failed: typeof patch.failed === 'number' ? patch.failed : job.failed,
    percentage: computePercentage(
      typeof patch.completed === 'number' ? patch.completed : job.completed,
      typeof patch.total === 'number' ? patch.total : job.total
    ),
  };

  ttsJobs.set(jobId, next);
  return next;
}

export function appendTtsJobResult(jobId: string, result: any): void {
  const job = ttsJobs.get(jobId);
  if (!job) return;
  job.results.push(result);
  // Map 内对象引用已更新，无需 set
}


