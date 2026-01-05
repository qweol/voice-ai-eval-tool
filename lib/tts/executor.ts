import { callGenericTTS } from '@/lib/providers/generic/caller';
import { getSystemProviders } from '@/lib/providers/system-providers';
import { calculateTtsCost } from '@/lib/cost/calculator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { GenericProviderConfig } from '@/lib/providers/generic/types';
import { TTSOptions } from '@/lib/types';
import { appendTtsJobResult, updateTtsJob } from '@/lib/tts/job-store';

interface ProviderVoice {
  providerId: string;
  voice: string;
  enabled: boolean;
}

export interface TtsExecutePayload {
  text: string;
  options?: TTSOptions;
  providerVoices?: ProviderVoice[];
  providers?: GenericProviderConfig[];
  batchCount?: number;
}

function safeBatchCount(batchCount: unknown): number {
  const n = Number(batchCount);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.trunc(n)));
}

export async function executeTtsJob(jobId: string, payload: TtsExecutePayload): Promise<void> {
  const { text, options, providerVoices, providers } = payload;
  const batchCount = safeBatchCount(payload.batchCount);

  updateTtsJob(jobId, { status: 'RUNNING', current: { provider: undefined, runIndex: undefined } });

  // 确保音频目录存在（可通过环境变量配置）
  const audioDir = process.env.AUDIO_STORAGE_DIR || path.join(process.cwd(), 'storage', 'audio');
  await mkdir(audioDir, { recursive: true }).catch(() => undefined);

  // 获取启用的提供者
  const enabledProviderVoices = providerVoices?.filter((pv) => pv.enabled) || [];
  const allProviders = providers || [];

  // 合并系统预置供应商配置（保持逻辑与 /api/tts/route.ts 一致）
  const systemProviders = getSystemProviders();
  const mergedProviders = allProviders.map((provider) => {
    if (provider.isSystem) {
      const systemProvider = systemProviders.find((sp) => sp.id === provider.id);
      if (systemProvider) {
        const allowedOverrides = {
          selectedModels: provider.selectedModels,
          selectedVoice: provider.selectedVoice,
          customModels: provider.customModels,
          enabled: provider.enabled,
        };
        const validOverrides = Object.fromEntries(
          Object.entries(allowedOverrides).filter(([_, v]) => v !== undefined)
        );
        return {
          ...systemProvider,
          ...validOverrides,
          apiKey: systemProvider.apiKey,
        };
      }
    }
    return provider;
  });

  // 筛选支持TTS的提供者
  const ttsProviders = mergedProviders.filter((p) => p.serviceType === 'tts' || p.serviceType === 'both');

  // 只处理前端选择启用的供应商
  const enabledProviderIds = new Set(enabledProviderVoices.map((pv) => pv.providerId));
  const filteredTtsProviders = ttsProviders.filter((provider) => enabledProviderIds.has(provider.id));

  // 更新 total（有时前端估算不准，这里以服务端为准）
  updateTtsJob(jobId, { total: filteredTtsProviders.length * batchCount });

  // 构建提供者调用列表
  const providerCalls = filteredTtsProviders.map((provider) => {
    const providerVoice = enabledProviderVoices.find((pv) => pv.providerId === provider.id);
    const voice = providerVoice?.voice || options?.voice || 'default';
    const ttsOptions: TTSOptions = {
      voice,
      speed: options?.speed,
    };
    return {
      name: provider.name,
      id: provider.id,
      templateType: provider.templateType,
      modelId: provider.selectedModels?.tts,
      voice,
      fn: () => callGenericTTS(provider, text, ttsOptions),
    };
  });

  let completed = 0;
  let failed = 0;

  try {
    for (const providerCall of providerCalls) {
      for (let runIndex = 1; runIndex <= batchCount; runIndex++) {
        updateTtsJob(jobId, { current: { provider: providerCall.name, runIndex } });

        try {
          const overallStart = Date.now();
          const result = await providerCall.fn();

          // 保存音频文件（批量下避免文件名冲突）
          const rand = Math.random().toString(36).slice(2, 8);
          const filename = `${providerCall.id}_${Date.now()}_${runIndex}_${rand}.wav`;
          const filepath = path.join(audioDir, filename);

          if (result.audioBuffer && result.audioBuffer.length > 0) {
            await writeFile(filepath, result.audioBuffer);
          } else {
            await writeFile(filepath, Buffer.from([]));
          }

          const endToEndTime = Date.now() - overallStart;

          const pricingInfo = calculateTtsCost({
            providerId: providerCall.id,
            templateType: providerCall.templateType,
            modelId: result.modelId,
            textLength: text.length,
          });

          const cost = pricingInfo?.amountUsd ?? 0;
          const pricingMetadata = pricingInfo
            ? {
                ruleId: pricingInfo.ruleId,
                unit: pricingInfo.unit,
                usageAmount: pricingInfo.usageAmount,
                originalAmount: pricingInfo.originalAmount,
                originalCurrency: pricingInfo.originalCurrency,
                isEstimated: pricingInfo.isEstimated,
                exchangeRate: pricingInfo.exchangeRate,
                notes: pricingInfo.notes,
                meta: pricingInfo.meta,
              }
            : { warning: 'pricing_rule_not_found' };

          appendTtsJobResult(jobId, {
            provider: providerCall.name,
            providerId: providerCall.id,
            modelId: result.modelId ?? providerCall.modelId,
            voice: providerCall.voice,
            templateType: providerCall.templateType,
            runIndex,
            audioUrl: `/api/storage/audio/${filename}`,
            duration: endToEndTime / 1000,
            ttfb: result.ttfb,
            totalTime: endToEndTime,
            providerLatencyMs: result.totalTime,
            providerDurationSec: result.duration,
            cost,
            pricing: pricingMetadata,
            status: 'success',
          });

          completed++;
          updateTtsJob(jobId, { completed, failed });
        } catch (error: any) {
          failed++;
          appendTtsJobResult(jobId, {
            provider: providerCall.name,
            providerId: providerCall.id,
            modelId: providerCall.modelId,
            voice: providerCall.voice,
            templateType: providerCall.templateType,
            runIndex,
            audioUrl: '',
            duration: 0,
            status: 'failed',
            error: error.message,
          });
          updateTtsJob(jobId, { completed, failed });
        }
      }
    }

    updateTtsJob(jobId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      current: { provider: undefined, runIndex: undefined },
    });
  } catch (error: any) {
    updateTtsJob(jobId, {
      status: 'FAILED',
      error: error.message || '未知错误',
      completedAt: new Date().toISOString(),
      current: { provider: undefined, runIndex: undefined },
    });
  }
}


