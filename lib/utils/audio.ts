import { parseBuffer } from 'music-metadata';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * 音频信息接口
 */
export interface AudioInfo {
  duration?: number;      // 时长（秒）
  format: string;         // 格式（wav/mp3/m4a/ogg）
  sampleRate?: number;    // 采样率（Hz）
  bitRate?: number;       // 比特率（kbps）
  channels?: number;      // 声道数
}

/**
 * 支持的音频格式
 */
export const SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3', 'm4a', 'ogg', 'aac', 'flac'];

/**
 * 最大文件大小（50MB）
 */
export const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 从 Buffer 提取音频信息
 */
export async function extractAudioInfo(buffer: Buffer, filename: string): Promise<AudioInfo> {
  try {
    const metadata = await parseBuffer(buffer, { mimeType: getMimeType(filename) });

    const format = path.extname(filename).toLowerCase().replace('.', '');

    return {
      duration: metadata.format.duration,
      format,
      sampleRate: metadata.format.sampleRate,
      bitRate: metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : undefined,
      channels: metadata.format.numberOfChannels,
    };
  } catch (error) {
    console.error('提取音频信息失败:', error);
    // 如果提取失败，至少返回格式信息
    const format = path.extname(filename).toLowerCase().replace('.', '');
    return { format };
  }
}

/**
 * 验证音频文件
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // 检查文件大小
  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${MAX_AUDIO_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  // 检查文件格式
  const ext = path.extname(file.name).toLowerCase().replace('.', '');
  if (!SUPPORTED_AUDIO_FORMATS.includes(ext)) {
    return {
      valid: false,
      error: `不支持的音频格式（支持: ${SUPPORTED_AUDIO_FORMATS.join(', ')}）`,
    };
  }

  return { valid: true };
}

/**
 * 生成唯一的文件名
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  return `${uuidv4()}${ext}`;
}

/**
 * 获取 MIME 类型
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}
