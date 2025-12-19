import { TemplateType } from '@/lib/providers/generic/types';

export type Currency = 'USD' | 'CNY';

export type BillingUnit =
  | 'per_char'
  | 'per_credit'
  | 'per_1k_chars'
  | 'per_10k_chars'
  | 'per_second'
  | 'per_minute';

export interface PricingRule {
  id: string;
  serviceType: 'tts' | 'asr';
  templateType?: TemplateType;
  providerIds?: string[];
  modelId?: string;
  unit: BillingUnit;
  amount: number;
  currency: Currency;
  source: string;
  notes?: string;
  isEstimated?: boolean;
  charsPerMinute?: number;
  charsPerSecond?: number;
}

/**
 * 统一的系统预置供应商定价规则
 * 备注：
 * - Cartesia 的 $0.0000533/credit based on 750 USD = 18,750 minutes
 *   且 1 minute ≈ 750 credits (=750 characters)
 * - gpt-4o-mini-tts 使用按分钟估算，需在 UI 中标记 isEstimated
 */
export const PRICING_RULES: PricingRule[] = [
  {
    id: 'openai-tts-1',
    serviceType: 'tts',
    templateType: 'openai',
    modelId: 'tts-1',
    unit: 'per_1k_chars',
    amount: 0.015,
    currency: 'USD',
    source: 'OpenAI Pricing',
  },
  {
    id: 'openai-tts-1-hd',
    serviceType: 'tts',
    templateType: 'openai',
    modelId: 'tts-1-hd',
    unit: 'per_1k_chars',
    amount: 0.03,
    currency: 'USD',
    source: 'OpenAI Pricing',
  },
  {
    id: 'openai-gpt4o-mini-tts-estimated',
    serviceType: 'tts',
    templateType: 'openai',
    modelId: 'gpt-4o-mini-tts',
    unit: 'per_minute',
    amount: 0.015,
    currency: 'USD',
    charsPerMinute: 750,
    isEstimated: true,
    notes: '官方按 token 计费，此为按分钟估算值，需要在 UI 标记为估算',
    source: 'OpenAI Pricing',
  },
  {
    id: 'qwen-qwen3-tts-flash',
    serviceType: 'tts',
    templateType: 'qwen',
    modelId: 'qwen3-tts-flash',
    unit: 'per_10k_chars',
    amount: 0.8,
    currency: 'CNY',
    source: '阿里云百炼定价（console doc）',
  },
  {
    id: 'minimax-speech-02-turbo',
    serviceType: 'tts',
    templateType: 'minimax',
    modelId: 'speech-02-turbo',
    unit: 'per_10k_chars',
    amount: 2,
    currency: 'CNY',
    source: 'MiniMax pay-as-you-go',
  },
  {
    id: 'cartesia-sonic',
    serviceType: 'tts',
    templateType: 'cartesia',
    unit: 'per_char',
    amount: 0.0000533,
    currency: 'USD',
    notes: '750 USD ≈ 18,750 min（Free plan），1 min ≈ 750 credits（1 credit per char）',
    isEstimated: true,
    source: 'https://cartesia.ai/pricing',
  },
  {
    id: 'qwen-paraformer-v2',
    serviceType: 'asr',
    templateType: 'qwen',
    modelId: 'paraformer-v2',
    unit: 'per_second',
    amount: 0.00008,
    currency: 'CNY',
    source: '阿里云百炼定价（console doc）',
  },
];

export function getPricingRules() {
  return PRICING_RULES;
}

