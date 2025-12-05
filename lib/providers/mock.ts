import { ASRResult, TTSResult, ASROptions, TTSOptions } from '../types';

/**
 * 模拟供应商适配器
 * 用于测试和演示，实际使用时需要替换为真实的 API 调用
 */

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟 ASR 识别
export async function mockRecognize(
  audioBuffer: Buffer,
  providerName: string,
  options?: ASROptions
): Promise<ASRResult> {
  const startTime = Date.now();

  // 模拟 API 调用延迟
  await delay(Math.random() * 1000 + 500);

  const duration = (Date.now() - startTime) / 1000;

  // 模拟不同供应商的识别结果（略有差异）
  const mockTexts: Record<string, string> = {
    '阿里云': '北京市海淀区中关村软件园',
    '腾讯云': '北京市海淀区中关村软件园',
    '百度': '北京市海淀区中关村软件园',
  };

  return {
    text: mockTexts[providerName] || '这是一段测试语音识别的文本内容',
    duration,
    confidence: 0.9 + Math.random() * 0.1,
  };
}

// 模拟 TTS 合成
export async function mockSynthesize(
  text: string,
  providerName: string,
  options?: TTSOptions
): Promise<TTSResult> {
  const startTime = Date.now();

  // 模拟 API 调用延迟
  await delay(Math.random() * 1000 + 800);

  const duration = (Date.now() - startTime) / 1000;

  // 返回空的音频 buffer（实际应该是真实的音频数据）
  // 在真实实现中，这里应该是从 API 返回的音频数据
  return {
    audioBuffer: Buffer.from([]),
    duration,
    format: 'mp3',
  };
}
