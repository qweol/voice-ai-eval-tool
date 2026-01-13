/**
 * 音频格式识别工具
 * 从文件名自动识别音频格式
 */

/**
 * 支持的音频格式列表
 */
export const SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3', 'm4a', 'flac', 'ogg'] as const;

export type AudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

/**
 * 从文件名自动识别音频格式
 * @param filename 文件名（包含扩展名）
 * @returns 音频格式，如果无法识别则返回 'wav' 作为默认值
 */
export function detectAudioFormat(filename: string): AudioFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext && SUPPORTED_AUDIO_FORMATS.includes(ext as AudioFormat)) {
    return ext as AudioFormat;
  }

  // 默认返回 wav
  return 'wav';
}

/**
 * 检查文件是否为支持的音频格式
 * @param filename 文件名
 * @returns 是否为支持的音频格式
 */
export function isSupportedAudioFormat(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? SUPPORTED_AUDIO_FORMATS.includes(ext as AudioFormat) : false;
}
