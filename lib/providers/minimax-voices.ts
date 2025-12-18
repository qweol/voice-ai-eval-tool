/**
 * Minimax 音色管理
 * 支持从 API 查询可用音色列表，并缓存结果
 */

import { VoiceDefinition } from './generic/types';

// 音色缓存（内存缓存）
let cachedVoices: VoiceDefinition[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 缓存 1 小时

/**
 * 从 Minimax API 查询可用音色列表
 * 参考：https://platform.minimaxi.com/docs/api-reference/voice-management-get
 */
export async function fetchMinimaxVoices(apiKey?: string): Promise<VoiceDefinition[]> {
  if (!apiKey) {
    // 尝试从环境变量获取
    apiKey = process.env.MINIMAX_API_KEY;
  }

  if (!apiKey) {
    console.warn('⚠️ Minimax API Key 未设置，无法查询音色列表');
    return [];
  }

  try {
    // 注意：代理 API 可能不支持音色查询端点
    // 如果使用代理 API，尝试使用官方 API 查询音色列表
    let apiUrl: string;
    if (process.env.MINIMAX_TTS_API_URL && process.env.MINIMAX_TTS_API_URL.includes('gcp-api.subsup.net')) {
      // 代理 API，使用官方 API 查询音色
      apiUrl = 'https://api.minimaxi.com/v1/voice_management/get';
      console.log('🔍 检测到代理 API，使用官方 API 查询音色列表');
    } else if (process.env.MINIMAX_TTS_API_URL) {
      // 自定义 API URL，尝试替换端点
      apiUrl = process.env.MINIMAX_TTS_API_URL.replace('/v1/t2a_v2', '/v1/voice_management/get');
    } else {
      // 使用官方 API
      apiUrl = 'https://api.minimaxi.com/v1/voice_management/get';
    }

    console.log('🔍 查询 Minimax 可用音色列表...');
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        voice_type: 'all', // 查询所有类型的音色
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Minimax 音色查询失败:', response.status, errorText);
      throw new Error(`查询音色列表失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Minimax 音色查询响应:', JSON.stringify(data).substring(0, 500));

    // 解析响应格式
    // 根据官方文档，响应格式应该是：
    // {
    //   "voices": [...],
    //   "base_resp": { "status_code": 0, "status_msg": "success" }
    // }
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax API 错误: ${data.base_resp.status_msg || '未知错误'}`);
    }

    const voices: VoiceDefinition[] = [];
    
    if (data.voices && Array.isArray(data.voices)) {
      for (const voice of data.voices) {
        voices.push({
          id: voice.voice_id || voice.id,
          name: voice.voice_name || voice.name || voice.voice_id || voice.id,
          description: voice.description || voice.voice_description || '',
          gender: voice.gender || (voice.voice_id?.includes('male') ? 'male' : voice.voice_id?.includes('female') ? 'female' : undefined),
          language: voice.language || 'zh',
        });
      }
    }

    console.log(`✅ 成功查询到 ${voices.length} 个可用音色`);
    return voices;
  } catch (error: any) {
    console.error('❌ 查询 Minimax 音色列表失败:', error.message);
    // 查询失败不影响系统运行，返回空数组
    return [];
  }
}

/**
 * 获取缓存的音色列表（如果缓存有效）
 */
export function getCachedVoices(): VoiceDefinition[] | null {
  if (cachedVoices && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedVoices;
  }
  return null;
}

/**
 * 设置音色缓存
 */
export function setCachedVoices(voices: VoiceDefinition[]) {
  cachedVoices = voices;
  cacheTimestamp = Date.now();
  console.log(`💾 已缓存 ${voices.length} 个 Minimax 音色`);
}

/**
 * 获取 Minimax 音色列表（优先使用缓存，缓存失效时查询 API）
 */
export async function getMinimaxVoices(apiKey?: string, forceRefresh = false): Promise<VoiceDefinition[]> {
  // 如果强制刷新或缓存无效，查询 API
  if (forceRefresh || !getCachedVoices()) {
    const voices = await fetchMinimaxVoices(apiKey);
    if (voices.length > 0) {
      setCachedVoices(voices);
      return voices;
    }
  }

  // 返回缓存的音色列表
  const cached = getCachedVoices();
  if (cached) {
    return cached;
  }

  // 如果缓存为空且查询失败，返回默认音色列表
  console.warn('⚠️ 使用默认音色列表（API 查询失败或未配置）');
  return getDefaultMinimaxVoices();
}

/**
 * 获取默认音色列表（当 API 查询失败时使用）
 */
export function getDefaultMinimaxVoices(): VoiceDefinition[] {
  return [
    {
      id: 'male-qn-qingse',
      name: '青涩（男声）',
      description: '标准男声音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'female-qn-qingqing',
      name: '清卿（女声）',
      description: '清新甜美，适合儿童内容、绘本朗读',
      gender: 'female',
      language: 'zh'
    },
  ];
}

/**
 * 在系统启动时初始化音色列表（可选，失败不影响启动）
 */
export async function initializeMinimaxVoices() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    console.log('ℹ️ Minimax API Key 未设置，跳过音色列表初始化');
    return;
  }

  try {
    console.log('🚀 系统启动：初始化 Minimax 音色列表...');
    await getMinimaxVoices(apiKey, false); // 不强制刷新，使用缓存
    console.log('✅ Minimax 音色列表初始化完成');
  } catch (error: any) {
    console.warn('⚠️ Minimax 音色列表初始化失败（不影响系统启动）:', error.message);
  }
}

