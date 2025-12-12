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
  duration: number;
  format?: string;
}

export interface TTSOptions {
  voice?: string; // 音色类型，例如：'standard' | 'premium' | 'large-model'，具体值取决于供应商
  speed?: number; // 语速，0-1 之间
  pitch?: number; // 音调，0-1 之间
  volume?: number; // 音量，0-1 之间
  language?: string; // 语言代码，例如：'zh' | 'en' | 'ja' 等
}

// 供应商适配器接口
export interface ASRAdapter {
  recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult>;
}

export interface TTSAdapter {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}
