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
 * 获取 Minimax 音色列表（直接使用默认配置列表）
 * 注意：由于 Minimax 音色管理 API 不可用，改为使用手动配置的音色列表
 */
export async function getMinimaxVoices(_apiKey?: string, _forceRefresh = false): Promise<VoiceDefinition[]> {
  // 直接返回默认音色列表（包含公司自定义克隆音色）
  console.log('ℹ️ 使用手动配置的 Minimax 音色列表');
  return getDefaultMinimaxVoices();

  // 以下代码已禁用（API 端点不可用）
  // if (forceRefresh || !getCachedVoices()) {
  //   const voices = await fetchMinimaxVoices(apiKey);
  //   if (voices.length > 0) {
  //     setCachedVoices(voices);
  //     return voices;
  //   }
  // }
  // const cached = getCachedVoices();
  // if (cached) {
  //   return cached;
  // }
  // return getDefaultMinimaxVoices();
}

/**
 * 获取默认音色列表（当 API 查询失败时使用）
 * 包含系统预置音色和公司自定义克隆音色
 */
export function getDefaultMinimaxVoices(): VoiceDefinition[] {
  return [
    // 系统预置音色
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
    // 公司自定义克隆音色
    {
      id: 'Midoo_9527',
      name: 'Midoo_9527',
      description: '自定义克隆音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'jingtantest01',
      name: 'jingtantest01',
      description: '自定义克隆音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'Cuteboy_platform',
      name: 'Cuteboy_platform',
      description: '自定义克隆音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'English_UpsetGirl',
      name: 'English_UpsetGirl',
      description: '自定义克隆音色（英语）',
      gender: 'female',
      language: 'en'
    },
    {
      id: 'English_Trustworthy_Man',
      name: 'English_Trustworthy_Man',
      description: '自定义克隆音色（英语）',
      gender: 'male',
      language: 'en'
    },
    {
      id: 'Jingtan_Yuri02',
      name: 'Jingtan_Yuri02',
      description: '自定义克隆音色',
      gender: 'female',
      language: 'zh'
    },
    {
      id: 'jingtan-youngmale01',
      name: 'jingtan-youngmale01',
      description: '自定义克隆音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'uk_woman16',
      name: 'uk_woman16',
      description: '自定义克隆音色（英语）',
      gender: 'female',
      language: 'en'
    },
    {
      id: 'jingtan_mira04_0801_1',
      name: 'jingtan_mira04_0801_1',
      description: '自定义克隆音色',
      gender: 'female',
      language: 'zh'
    },
    {
      id: 'jingtan_mira04_0923_2',
      name: 'jingtan_mira04_0923_2',
      description: '自定义克隆音色',
      gender: 'female',
      language: 'zh'
    },
    {
      id: 'Mateo_0001',
      name: 'Mateo_0001',
      description: '自定义克隆音色',
      gender: 'male',
      language: 'zh'
    },
    {
      id: 'Eva_0002',
      name: 'Eva_0002',
      description: '自定义克隆音色',
      gender: 'female',
      language: 'zh'
    },
    {
      id: 'Cantonese_CuteGirl',
      name: 'Cantonese_CuteGirl',
      description: '自定义克隆音色（粤语）',
      gender: 'female',
      language: 'yue'
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

