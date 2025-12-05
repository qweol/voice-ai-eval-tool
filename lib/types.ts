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
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

// 供应商适配器接口
export interface ASRAdapter {
  recognize(audioBuffer: Buffer, options?: ASROptions): Promise<ASRResult>;
}

export interface TTSAdapter {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}
