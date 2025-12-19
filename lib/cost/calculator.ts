import { TemplateType } from '@/lib/providers/generic/types';
import {
  BillingUnit,
  Currency,
  PRICING_RULES,
  PricingRule,
} from './pricing';

interface CostCalculatorInput {
  serviceType: 'tts' | 'asr';
  providerId?: string;
  templateType?: TemplateType;
  modelId?: string;
  textLength?: number; // 字符数量（TTS）
  durationSeconds?: number; // ASR/音频时长
}

export interface CostCalculationResult {
  amountUsd: number;
  originalAmount: number;
  originalCurrency: Currency;
  unit: BillingUnit;
  usageAmount: number;
  ruleId: string;
  isEstimated?: boolean;
  exchangeRate: number;
  notes?: string;
  meta?: Record<string, any>;
}

const USD_TO_CNY = parseFloat(process.env.USD_TO_CNY_RATE || '7.0'); // 1 USD = X CNY

function findRule(input: CostCalculatorInput): PricingRule | undefined {
  return PRICING_RULES.find(rule => {
    if (rule.serviceType !== input.serviceType) return false;
    if (rule.modelId && rule.modelId !== input.modelId) return false;
    if (rule.templateType && rule.templateType !== input.templateType) return false;
    if (rule.providerIds && input.providerId && !rule.providerIds.includes(input.providerId)) {
      return false;
    }
    return true;
  });
}

function convertToUsd(amount: number, currency: Currency) {
  if (currency === 'USD') {
    return { amountUsd: amount, exchangeRate: 1 };
  }

  if (currency === 'CNY') {
    return {
      amountUsd: amount / USD_TO_CNY,
      exchangeRate: USD_TO_CNY,
    };
  }

  return { amountUsd: amount, exchangeRate: 1 };
}

function computeUsage(
  rule: PricingRule,
  input: CostCalculatorInput
): { usage: number; meta?: Record<string, any> } {
  const meta: Record<string, any> = {};

  switch (rule.unit) {
    case 'per_char':
    case 'per_credit':
      return { usage: input.textLength || 0 };
    case 'per_1k_chars':
      return { usage: (input.textLength || 0) / 1000 };
    case 'per_10k_chars':
      return { usage: (input.textLength || 0) / 10000 };
    case 'per_minute': {
      const charsPerMinute = rule.charsPerMinute || 750;
      meta.charsPerMinute = charsPerMinute;
      return { usage: (input.textLength || 0) / charsPerMinute, meta };
    }
    case 'per_second': {
      if (input.durationSeconds) {
        return { usage: input.durationSeconds };
      }
      if (rule.charsPerSecond && input.textLength) {
        meta.charsPerSecond = rule.charsPerSecond;
        return { usage: input.textLength / rule.charsPerSecond, meta };
      }
      return { usage: 0 };
    }
    default:
      return { usage: 0 };
  }
}

export function calculateTtsCost(params: {
  providerId?: string;
  templateType?: TemplateType;
  modelId?: string;
  textLength: number;
}): CostCalculationResult | null {
  const rule = findRule({
    serviceType: 'tts',
    providerId: params.providerId,
    templateType: params.templateType,
    modelId: params.modelId,
  });

  if (!rule) {
    return null;
  }

  const { usage, meta } = computeUsage(rule, {
    serviceType: 'tts',
    textLength: params.textLength,
  });

  const originalAmount = usage * rule.amount;
  const { amountUsd, exchangeRate } = convertToUsd(originalAmount, rule.currency);

  return {
    amountUsd,
    originalAmount,
    originalCurrency: rule.currency,
    unit: rule.unit,
    usageAmount: usage,
    ruleId: rule.id,
    isEstimated: rule.isEstimated,
    exchangeRate,
    notes: rule.notes,
    meta,
  };
}

