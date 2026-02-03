/**
 * 通用API调用器
 * 支持调用任意兼容的语音API
 */

import { GenericProviderConfig, RequestVariables } from './types';
import { ASRResult, TTSResult, ASROptions, TTSOptions } from '../../types';
import { templates } from './templates';
import { getTemplate } from './template-loader';
import WebSocket from 'ws';

/**
 * 获取要使用的模型ID
 */
function getModelId(config: GenericProviderConfig, serviceType: 'asr' | 'tts'): string {
  let modelId: string | undefined;

  // 1. 优先使用自定义模型
  if (config.customModels?.[serviceType]) {
    modelId = config.customModels[serviceType];
  }
  // 2. 使用用户选择的模型
  else if (config.selectedModels?.[serviceType]) {
    modelId = config.selectedModels[serviceType];
  }
  // 3. 使用模板默认模型
  else if (config.templateType) {
    // 先尝试从内置模板获取（同步，向后兼容）
    const builtinTemplate = templates[config.templateType as keyof typeof templates];
    if (builtinTemplate?.defaultModel?.[serviceType]) {
      modelId = builtinTemplate.defaultModel[serviceType];
    }
  }

  // 4. 迁移逻辑：如果检测到已删除的 paraformer-v2，自动替换为 qwen3-asr-flash
  if (serviceType === 'asr' && modelId === 'paraformer-v2' && config.templateType === 'qwen') {
    console.warn('⚠️ 检测到已删除的模型 paraformer-v2，自动迁移为 qwen3-asr-flash');
    modelId = 'qwen3-asr-flash';
  }

  // 5. 如果还没有模型ID，回退到硬编码默认值
  if (!modelId) {
    if (serviceType === 'asr') {
      modelId = config.templateType === 'openai' ? 'whisper-1' : 'default';
    } else {
      modelId = config.templateType === 'openai' ? 'gpt-4o-mini-tts' : 'default';
    }
  }

  return modelId;
}

/**
 * 语言代码映射
 * 将统一的语言代码映射到各供应商特定的格式
 */
function mapLanguageCode(language: string | undefined, templateType?: string): string | undefined {
  if (!language || language === 'auto') {
    return undefined; // 自动检测
  }

  // 语言代码映射表
  const languageMap: Record<string, Record<string, string>> = {
    // 豆包使用的语言代码
    doubao: {
      'zh': 'zh-CN',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'es': 'es-ES', // 豆包使用西班牙语（欧洲）
      'yue': 'yue-CN', // 粤语
    },
    // Azure 使用的语言代码
    azure: {
      'zh': 'zh-CN',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'es': 'es-ES',
      'yue': 'zh-HK',
    },
    // Deepgram 使用简短代码
    deepgram: {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'yue': 'zh',
    },
    // OpenAI Whisper 使用 ISO 639-1 代码
    openai: {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'yue': 'zh', // Whisper 将粤语识别为中文
    },
    // Qwen 使用简短代码
    qwen: {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'yue': 'yue',
    },
    // Cartesia 语言代码
    cartesia: {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'yue': 'zh', // Cartesia 不支持粤语，映射为中文
    },
    // Minimax 语言代码
    // 注意：Minimax 使用 language_boost 参数来指定语言，粤语使用 "Chinese,Yue" 格式
    // 这里的映射仅用于兼容性，实际使用 language_boost 参数（见 callMinimaxTTS 函数）
    minimax: {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'yue': 'yue', // 粤语在 callMinimaxTTS 中会转换为 "Chinese,Yue"
    },
  };

  const providerMap = languageMap[templateType || 'openai'] || languageMap.openai;
  return providerMap[language] || language;
}

/**
 * 获取要使用的音色ID
 */
function getVoiceId(config: GenericProviderConfig, optionsVoice?: string): string {
  // 1. 优先使用传入的音色参数
  if (optionsVoice && optionsVoice !== 'default') {
    return optionsVoice;
  }

  // 2. 使用配置中选择的音色
  if (config.selectedVoice) {
    return config.selectedVoice;
  }

  // 3. 使用模板中第一个可用音色
  if (config.templateType) {
    // 先尝试从内置模板获取（同步，向后兼容）
    const builtinTemplate = templates[config.templateType as keyof typeof templates];
    if (builtinTemplate?.models) {
      const ttsModel = builtinTemplate.models.find(
        m => m.type === 'tts' && m.id === config.selectedModels?.tts
      );
      if (ttsModel?.voices && ttsModel.voices.length > 0) {
        return ttsModel.voices[0].id;
      }
    }
  }

  // 4. 回退到默认音色
  return 'alloy';
}

/**
 * 转义 JSON 字符串中的特殊字符
 */
function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // 反斜杠（必须最先处理）
    .replace(/"/g, '\\"')      // 双引号
    .replace(/\n/g, '\\n')     // 换行符
    .replace(/\r/g, '\\r')     // 回车符
    .replace(/\t/g, '\\t')     // 制表符
    .replace(/[\b]/g, '\\b')   // 退格符（使用字符类避免与\b单词边界混淆）
    .replace(/\f/g, '\\f');    // 换页符
}

/**
 * 替换模板中的变量
 */
function replaceVariables(template: string, variables: RequestVariables): string {
  let result = template;

  // 替换所有 {variable} 格式的变量
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    if (value !== undefined && value !== null) {
      // 对字符串类型的值进行 JSON 转义，数字和布尔值保持原样
      let stringValue: string;
      if (typeof value === 'string') {
        stringValue = escapeJsonString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        // 数字和布尔值直接转换，不加引号
        stringValue = String(value);
      } else {
        // 其他类型（对象、数组等）转换为 JSON 字符串
        stringValue = JSON.stringify(value);
      }
      result = result.replace(regex, stringValue);
    }
  }

  // 移除包含未替换变量的简单键值对行（只匹配 "key": "{value}" 格式）
  // 这个正则只匹配简单的字符串值，不会匹配嵌套对象
  // 修复：确保正确处理逗号和换行符，避免留下格式错误的 JSON
  // 匹配整行，包括前后的逗号和换行符
  result = result.replace(/,?\s*"[^"]+"\s*:\s*"\{[^}]+\}"\s*,?/g, '');

  // 清理可能产生的多余逗号（JSON 对象中的尾随逗号）
  result = result.replace(/,(\s*[}\]])/g, '$1');
  // 清理连续的逗号
  result = result.replace(/,\s*,/g, ',');
  // 清理对象开始后的逗号
  result = result.replace(/(\{\s*),/g, '$1');
  // 清理闭合括号前的逗号和换行符
  result = result.replace(/,\s*\n\s*([}\]])/g, '\n$1');
  // 清理 } 后面直接跟 " 的情况（缺少逗号）
  result = result.replace(/(\})\s*\n\s*"/g, '$1,\n"');

  return result;
}

/**
 * 根据路径获取嵌套对象的值
 * 支持 "result.text" 或 "data[0].text" 格式
 */
function getValueByPath(obj: any, path: string): any {
  if (!path) return undefined;
  
  const parts = path.split(/[\.\[\]]/).filter(p => p);
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * 构建认证头
 */
function buildAuthHeaders(config: GenericProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.requestHeaders) {
    Object.assign(headers, config.requestHeaders);
  }

  switch (config.authType) {
    case 'bearer':
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      break;
    case 'apikey':
      if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
        // Cartesia 特殊处理：不添加 Authorization header
        if (config.templateType !== 'cartesia') {
          // 有些服务商使用不同的头名称
          headers['Authorization'] = `ApiKey ${config.apiKey}`;
        }
      }
      break;
    case 'custom':
      if (config.authHeader) {
        const [key, value] = config.authHeader.split(':').map(s => s.trim());
        if (key && value) {
          headers[key] = replaceVariables(value, { api_key: config.apiKey || '' });
        }
      }
      break;
  }

  // Cartesia 特殊处理：添加 Cartesia-Version header（允许外部覆盖）
  if (config.templateType === 'cartesia' && !headers['Cartesia-Version']) {
    headers['Cartesia-Version'] = '2024-06-30';
  }

  // Doubao/豆包 特殊处理：使用自定义Header认证
  if (config.templateType === 'doubao') {
    // 豆包需要特殊的Header格式
    if (config.apiKey) {
      headers['X-Api-Access-Key'] = config.apiKey;
    }
    if (config.appId) {
      headers['X-Api-App-Key'] = config.appId;
    }
    // 从 requestHeaders 中获取 Resource ID，如果没有则使用默认值
    const resourceId = config.requestHeaders?.['X-Api-Resource-Id'] || 'volc.bigasr.auc_turbo';
    headers['X-Api-Resource-Id'] = resourceId;
    headers['X-Api-Request-Id'] = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    headers['X-Api-Sequence'] = '-1'; // -1表示单次请求
  }

  return headers;
}

/**
 * 调用通用ASR API
 */
export async function callGenericASR(
  config: GenericProviderConfig,
  audioBuffer: Buffer,
  options?: ASROptions
): Promise<ASRResult> {
  const startTime = Date.now();

  try {
    // 1. 准备变量
    const audioBase64 = audioBuffer.toString('base64');
    const modelId = getModelId(config, 'asr');

    // 映射语言代码到供应商特定格式
    const mappedLanguage = mapLanguageCode(options?.language, config.templateType);
    console.log('🔍 语言参数映射调试:', {
      原始语言: options?.language,
      模板类型: config.templateType,
      映射后语言: mappedLanguage,
    });

    const variables: RequestVariables = {
      audio: audioBase64,
      audioBase64: audioBase64,
      audio_url: audioBase64, // 保留用于其他可能需要的API
      language: mappedLanguage || '', // 使用映射后的语言代码，如果是 auto 则为空
      format: options?.format || 'wav',
      model: modelId,
      uid: 'user_001', // 豆包需要的用户ID
    };

    // 2. 构建完整的API URL
    let apiUrl = config.apiUrl;

    // OpenAI风格：确保使用正确的ASR端点
    if (config.templateType === 'openai') {
      // 如果URL包含 /audio/speech（TTS端点），替换为 /audio/transcriptions（ASR端点）
      if (apiUrl.includes('/audio/speech')) {
        apiUrl = apiUrl.replace('/audio/speech', '/audio/transcriptions');
      }
      // 如果URL是基础URL（/v1结尾），添加ASR端点
      else if (!apiUrl.includes('/audio/transcriptions')) {
        if (apiUrl.endsWith('/v1') || apiUrl.endsWith('/v1/')) {
          apiUrl = apiUrl.replace(/\/v1\/?$/, '/v1/audio/transcriptions');
        } else if (!apiUrl.includes('/audio/')) {
          // 如果URL既不包含/v1也不包含/audio/，直接添加
          apiUrl = apiUrl.replace(/\/?$/, '/audio/transcriptions');
        }
      }
    }

    // Qwen风格：使用多模态对话端点（与TTS相同）
    if (config.templateType === 'qwen') {
      apiUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    }

    // Cartesia：将 TTS 端点自动改为 ASR 端点
    if (config.templateType === 'cartesia') {
      if (apiUrl.includes('/audio/transcriptions') || apiUrl.includes('/stt')) {
        // 已是 ASR 端点，保持
      } else if (apiUrl.includes('/tts/bytes')) {
        apiUrl = apiUrl.replace('/tts/bytes', '/stt');
      } else if (apiUrl.includes('/tts')) {
        apiUrl = apiUrl.replace('/tts', '/stt');
      } else {
        // 如果是基础域名或其他路径，默认追加 /stt
        apiUrl = apiUrl.replace(/\/?$/, '/stt');
      }
    }

    // 3. OpenAI风格使用multipart/form-data，其他使用JSON
    let response: Response;

    if (config.templateType === 'openai') {
      // OpenAI Whisper API 需要使用 multipart/form-data
      const formData = new FormData();

      // 创建 Blob 对象（将 Buffer 转换为 Uint8Array）
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
        type: `audio/${options?.format || 'wav'}`
      });

      // 添加文件字段
      formData.append('file', audioBlob, `audio.${options?.format || 'wav'}`);
      formData.append('model', modelId);

      // 如果指定了语言，添加 language 参数
      if (mappedLanguage) {
        formData.append('language', mappedLanguage);
      }

      formData.append('response_format', 'json');

      // 构建认证头（不包含 Content-Type，让浏览器自动设置）
      const headers: Record<string, string> = {};

      switch (config.authType) {
        case 'bearer':
          if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
          }
          break;
        case 'apikey':
          if (config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
            headers['Authorization'] = `ApiKey ${config.apiKey}`;
          }
          break;
        case 'custom':
          if (config.authHeader) {
            const [key, value] = config.authHeader.split(':').map(s => s.trim());
            if (key && value) {
              headers[key] = replaceVariables(value, { api_key: config.apiKey || '' });
            }
          }
          break;
      }

      // 添加自定义请求头（但不覆盖 Content-Type）
      if (config.requestHeaders) {
        Object.entries(config.requestHeaders).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            headers[key] = value;
          }
        });
      }

      console.log('=== OpenAI ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('格式:', options?.format);
      console.log('音频大小:', audioBuffer.length, 'bytes');
      console.log('语言:', mappedLanguage || '自动检测');

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: formData,
      });
    } else if (config.templateType === 'cartesia') {
      // Cartesia ASR 使用 multipart/form-data
      const formData = new FormData();

      const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
        type: `audio/${options?.format || 'wav'}`
      });

      formData.append('file', audioBlob, `audio.${options?.format || 'wav'}`);
      formData.append('model', modelId);

      if (mappedLanguage) {
        formData.append('language', mappedLanguage);
      }

      const headers = buildAuthHeaders(config);
      delete headers['Content-Type'];

      // ASR 使用最新版本（如用户未显式指定）
      if (!config.requestHeaders?.['Cartesia-Version']) {
        headers['Cartesia-Version'] = '2025-04-16';
      }

      // STT 文档要求 Authorization 头，若缺失则补充
      if (config.apiKey && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      console.log('=== Cartesia ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('格式:', options?.format);
      console.log('音频大小:', audioBuffer.length, 'bytes');
      console.log('语言:', mappedLanguage || '自动检测');

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: formData,
      });
    } else if (config.templateType === 'azure') {
      // Azure 使用 multipart/form-data 格式
      const formData = new FormData();

      // 创建 Blob 对象
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
        type: `audio/${options?.format || 'wav'}`
      });

      // 添加音频文件
      formData.append('audio', audioBlob, `audio.${options?.format || 'wav'}`);

      // 添加 definition 参数（JSON 格式）
      // 如果指定了语言，使用该语言；否则使用多语言候选列表
      const definition = mappedLanguage
        ? { locales: [mappedLanguage] }
        : { locales: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES'] };
      formData.append('definition', JSON.stringify(definition));

      // 构建认证头（不包含 Content-Type）
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['Ocp-Apim-Subscription-Key'] = config.apiKey;
      }

      console.log('=== Azure ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('格式:', options?.format);
      console.log('音频大小:', audioBuffer.length, 'bytes');
      console.log('语言:', mappedLanguage || `多语言候选: ${definition.locales.join(', ')}`);

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: formData,
      });
    } else if (config.templateType === 'deepgram') {
      // Deepgram 使用二进制上传方式
      // 通过 URL 查询参数传递模型和配置

      // 使用映射后的语言参数
      let actualModel = modelId;

      // Nova-3 支持的语言列表
      const nova3Languages = ['en', 'es', 'fr', 'pt', 'de', 'nl', 'sv', 'da', 'it', 'tr', 'no', 'id'];

      // 如果指定了语言且选择了 nova-3 但语言不支持，自动降级到 base
      if (mappedLanguage && modelId === 'nova-3' && !nova3Languages.includes(mappedLanguage)) {
        actualModel = 'base';
        console.log(`⚠️ Nova-3 不支持语言 "${mappedLanguage}"，自动切换到 base 模型`);
      }

      // 如果指定了语言且选择了 nova-2 但语言不支持，也降级到 base
      if (mappedLanguage && modelId === 'nova-2' && !nova3Languages.includes(mappedLanguage)) {
        actualModel = 'base';
        console.log(`⚠️ Nova-2 不支持语言 "${mappedLanguage}"，自动切换到 base 模型`);
      }

      // 构建查询参数
      const queryParams: Record<string, string> = {
        model: actualModel,
        smart_format: 'true', // 启用智能格式化
      };

      // 如果指定了语言，使用该语言；否则启用多语言检测
      if (mappedLanguage) {
        queryParams.language = mappedLanguage;
      } else {
        // 使用 detect_language 参数让 Deepgram 自动检测语言
        queryParams.detect_language = 'true';
      }

      const queryString = new URLSearchParams(queryParams).toString();

      // 构建完整的 API URL
      const fullUrl = `${apiUrl}?${queryString}`;

      // 构建认证头（Deepgram 使用 "Authorization: Token YOUR_API_KEY"）
      const headers: Record<string, string> = {
        'Content-Type': `audio/${options?.format || 'wav'}`,
      };

      if (config.apiKey) {
        headers['Authorization'] = `Token ${config.apiKey}`;
      }

      console.log('=== Deepgram ASR API 调用信息 ===');
      console.log('API URL:', fullUrl);
      console.log('请求模型:', modelId);
      console.log('实际模型:', actualModel);
      console.log('格式:', options?.format);
      console.log('音频大小:', audioBuffer.length, 'bytes');
      console.log('语言:', mappedLanguage || '自动检测（detect_language=true）');
      console.log('Content-Type:', headers['Content-Type']);
      console.log('Authorization:', headers['Authorization'] ? 'Token ***' : '未设置');

      response = await fetch(fullUrl, {
        method: config.method,
        headers,
        body: new Uint8Array(audioBuffer), // 将 Buffer 转换为 Uint8Array
      });
    } else if (config.templateType === 'gemini') {
      // Gemini (Vertex AI) 使用特殊的多模态格式
      // 1. 检测音频格式的 MIME 类型
      const mimeType = `audio/${options?.format || 'wav'}`;

      // 2. 替换 URL 中的 {model} 占位符
      apiUrl = apiUrl.replace('{model}', modelId);

      // 3. 获取 Vertex AI 访问令牌
      const { getCachedVertexAIAccessToken } = await import('./vertex-ai-auth');
      const accessToken = await getCachedVertexAIAccessToken(config.apiKey || '');

      // 4. 构建请求体
      const requestBody = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: audioBase64
                }
              },
              {
                text: 'Transcribe this audio file accurately. Provide the transcription text only.'
              }
            ]
          }
        ]
      };

      console.log('=== Gemini (Vertex AI) ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('格式:', options?.format);
      console.log('MIME类型:', mimeType);
      console.log('音频大小:', audioBuffer.length, 'bytes');
      console.log('语言:', mappedLanguage || '自动检测');

      response = await fetch(apiUrl, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });
    } else {
      // 其他API使用JSON格式
      let requestBody: any;

      // 特殊处理：qwen3-asr-flash 需要使用 messages 格式（优先判断）
      if (config.templateType === 'qwen' && modelId === 'qwen3-asr-flash') {
        console.log('🔄 使用 qwen3-asr-flash 的 messages 格式');
        // 根据官方文档，请求体结构应该是 { model, input: { messages }, parameters: { asr_options } }
        requestBody = {
          model: modelId,
          input: {
            messages: [
              {
                role: 'system',
                content: [{ text: '' }]
              },
              {
                role: 'user',
                content: [{ audio: `data:audio/${options?.format || 'wav'};base64,${audioBase64}` }]
              }
            ]
          }
        };

        // 如果指定了语言，添加到 parameters.asr_options 中
        if (mappedLanguage) {
          requestBody.parameters = {
            asr_options: {
              language: mappedLanguage
            }
          };
          console.log('✅ qwen3-asr-flash: 添加语言参数 =', mappedLanguage);
        } else {
          console.log('⚠️ qwen3-asr-flash: 未指定语言，使用自动检测');
        }
      } else {
        // 其他模型：使用模板构建请求体
        let bodyTemplate: string | undefined;

        if (config.templateType && templates[config.templateType as keyof typeof templates]) {
          // 从模板中获取ASR专用的请求体模板
          const template = templates[config.templateType as keyof typeof templates];
          bodyTemplate = template.requestBodyTemplate?.asr;
          console.log('使用模板中的ASR请求体:', config.templateType);
        }

        // 如果没有找到ASR模板，尝试使用config.requestBody（但这可能是TTS模板）
        if (!bodyTemplate && config.requestBody) {
          bodyTemplate = config.requestBody;
          console.warn('⚠️ 警告: 未找到ASR专用模板，使用config.requestBody（可能是TTS模板）');
        }

        if (bodyTemplate) {
          const bodyString = replaceVariables(bodyTemplate, variables);
          try {
            requestBody = JSON.parse(bodyString);
          } catch (error) {
            throw new Error(`请求体模板解析失败: ${error}`);
          }
        } else {
          // 如果没有模板，使用默认格式
          console.warn('⚠️ 警告: 没有找到请求体模板，使用默认格式');
          requestBody = {
            audio: audioBase64,
            format: variables.format,
          };
          // 如果指定了语言，添加 language 参数
          if (mappedLanguage) {
            requestBody.language = mappedLanguage;
          }
        }
      }

      // 豆包极速版不支持 language 参数，需要强制删除
      if (requestBody && typeof requestBody === 'object') {
        if (config.templateType === 'doubao' && modelId === 'bigmodel-flash') {
          // 极速版：强制删除 language 参数
          if (requestBody.request && typeof requestBody.request === 'object') {
            delete requestBody.request.language;
          }
          console.log('⚠️ 豆包极速版不支持 language 参数，已自动移除');
        } else if (!mappedLanguage) {
          // 其他情况：如果语言参数为空，清理请求体中的 language 字段
          delete requestBody.language;
          if (requestBody.parameters && typeof requestBody.parameters === 'object') {
            delete requestBody.parameters.language;
          }
          if (requestBody.request && typeof requestBody.request === 'object') {
            delete requestBody.request.language;
          }
        }
      }

      // 构建请求头
      const headers = buildAuthHeaders(config);

      console.log('=== ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('语言:', mappedLanguage || '自动检测');
      console.log('请求体（前500字符）:', JSON.stringify(requestBody).substring(0, 500));
      console.log('请求头:', JSON.stringify(headers, null, 2));

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: JSON.stringify(requestBody),
      });
    }

    // 4. 解析响应
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应Content-Type:', response.headers.get('content-type'));

    // 先获取原始响应文本用于调试
    const responseText = await response.text();
    console.log('原始响应（前500字符）:', responseText.substring(0, 500));

    // 尝试解析JSON
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('JSON解析失败:', parseError.message);
      console.error('完整响应文本:', responseText);
      throw new Error(`API返回了非JSON格式的响应: ${responseText.substring(0, 200)}`);
    }

    console.log('解析后的响应数据:', JSON.stringify(responseData).substring(0, 500));

    if (!response.ok) {
      const errorMessage = config.errorPath
        ? getValueByPath(responseData, config.errorPath) || response.statusText
        : response.statusText;
      throw new Error(`API调用失败: <${response.status}> ${errorMessage}`);
    }

    // 5. 提取文本
    let text: string = '';

    // 特殊处理：qwen3-asr-flash 使用 messages 响应格式
    if (config.templateType === 'qwen' && modelId === 'qwen3-asr-flash') {
      // qwen3-asr-flash 响应格式: output.choices[0].message.content[0].text
      text = getValueByPath(responseData, 'output.choices[0].message.content[0].text') || '';
      console.log('📝 从 qwen3-asr-flash messages 格式中提取文本');
    } else if (config.templateType === 'doubao') {
      // 豆包极速版响应格式: result.text (官方文档格式)
      // 响应结构: {"audio_info": {...}, "result": {"text": "...", "utterances": [...]}}
      const resultText = getValueByPath(responseData, 'result.text');
      text = resultText || '';
      console.log('📝 从豆包响应中提取文本，路径: result.text');
    } else if (config.templateType === 'deepgram') {
      // Deepgram 支持两种响应格式：
      // 1. 简化格式: result.text
      // 2. 标准格式: results.channels[0].alternatives[0].transcript
      // 注意：需要过滤空字符串，因为 Deepgram 可能返回 transcript: ""
      const resultText = getValueByPath(responseData, 'result.text');
      const transcriptText = getValueByPath(responseData, 'results.channels[0].alternatives[0].transcript');

      console.log('🔍 Deepgram 文本提取调试:');
      console.log('  - result.text 值:', JSON.stringify(resultText));
      console.log('  - transcript 值:', JSON.stringify(transcriptText));
      console.log('  - responseData 结构:', JSON.stringify(responseData).substring(0, 200));
      console.log('  - metadata:', JSON.stringify(responseData.metadata));
      console.log('  - 是否有错误:', responseData.error || responseData.err_msg || '无');

      // 优先使用非空的文本
      text = (resultText && resultText.trim()) || (transcriptText && transcriptText.trim()) || '';
      console.log('📝 从 Deepgram 响应中提取文本，最终结果:', JSON.stringify(text));
    } else {
      // 其他模型使用配置的响应路径
      text = config.responseTextPath
        ? getValueByPath(responseData, config.responseTextPath)
        : responseData.text || responseData.result?.text || '';
    }

    if (!text) {
      throw new Error('无法从响应中提取文本，请检查responseTextPath配置');
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      text: String(text),
      duration,
      confidence: responseData.confidence || responseData.result?.confidence,
    };
  } catch (error: any) {
    throw new Error(`通用ASR API调用失败: ${error.message}`);
  }
}

/**
 * 调用通用TTS API
 */
export async function callGenericTTS(
  config: GenericProviderConfig,
  text: string,
  options?: TTSOptions
): Promise<TTSResult> {
  const startTime = Date.now();
  let ttfb: number | null = null;
  const modelId = getModelId(config, 'tts');
  const characterCount = text.length;

  try {
    // 0. 特殊处理：Minimax 使用 WebSocket，调用专用函数
    // 注意：只有当 protocol 明确为 'websocket' 时才使用 WebSocket
    // 如果 protocol 为 'http' 或未设置，则使用标准 HTTP 调用
    if (config.templateType === 'minimax' && config.protocol === 'websocket') {
      console.log('🔄 检测到 Minimax 供应商（WebSocket），使用 WebSocket 调用器');
      return await callMinimaxTTS(config, text, options);
    }
    
    // 如果 protocol 是 'http' 或未设置，继续使用标准 HTTP 调用流程
    if (config.templateType === 'minimax' && config.protocol !== 'websocket') {
      console.log('🔄 检测到 Minimax 供应商（HTTP），使用 HTTP 调用器');
    }

    // 特殊处理：Azure TTS 使用 SSML 格式
    if (config.templateType === 'azure') {
      console.log('🔄 检测到 Azure TTS，使用 SSML 格式');
      return await callAzureTTS(config, text, options);
    }

    // 1. 准备变量
    const voiceId = getVoiceId(config, options?.voice);
    
    // 调试日志：检查模型获取
    console.log('🔍 模型获取调试:', {
      customModels: config.customModels,
      selectedModels: config.selectedModels,
      templateType: config.templateType,
      finalModelId: modelId,
    });

    // 根据语言代码生成 language_type（用于 Qwen3-TTS）
    const languageTypeMap: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'yue': 'Cantonese', // 粤语
    };
    const detectDefaultLanguage = (): string | undefined => {
      // 如果明确传入了 language 参数
      if (options?.language) {
        // 如果是 'auto'，返回 undefined，让模型自己识别
        if (options.language === 'auto') {
          return undefined;
        }
        // 直接返回用户选择的语言，不做任何转换
        return options.language;
      }
      // 如果没有传 language 参数，默认让模型自动识别
      return undefined;
    };

    const language = detectDefaultLanguage();
    const languageType = language ? (languageTypeMap[language] || 'Chinese') : undefined;

    // 根据供应商类型选择正确的速度参数
    let speedValue = options?.speed !== undefined ? options.speed : 1.0;
    if (config.templateType === 'cartesia' && options?.cartesiaSpeed !== undefined) {
      speedValue = options.cartesiaSpeed;
    }

    const variables: RequestVariables = {
      text,
      model: modelId,
      voice: voiceId,
      speed: speedValue,
      language: language, // auto 模式时为 undefined，让模型自己识别
      language_type: languageType, // auto 模式时为 undefined
      format: 'wav', // 统一使用 WAV 格式
      sample_rate: 24000, // 统一使用 24kHz 采样率
    };

    // Cartesia 特殊处理：添加 transcription_speed 参数
    if (config.templateType === 'cartesia') {
      variables.transcription_speed = variables.speed;
    }

    // 2. 构建请求体
    let requestBody: any;

    console.log('config.requestBody 存在?', !!config.requestBody);
    console.log('config.templateType:', config.templateType);

    if (config.requestBody) {
      let bodyTemplate = config.requestBody;

      // 自动修复：如果使用 Qwen 模板但 requestBody 是旧格式，自动更新
      if (config.templateType === 'qwen' && bodyTemplate.includes('"input": "{text}"')) {
        console.warn('⚠️ 检测到旧的 Qwen 模板格式，自动更新为正确格式...');
        const template = templates.qwen;
        bodyTemplate = template.requestBodyTemplate.tts || bodyTemplate;
        console.log('✅ 已更新为新的模板格式');
      }

      console.log('使用的请求体模板:', bodyTemplate);
      const bodyString = replaceVariables(bodyTemplate, variables);
      console.log('替换变量后:', bodyString);
      try {
        requestBody = JSON.parse(bodyString);
      } catch (error: any) {
        throw new Error(`请求体模板解析失败: ${error.message}`);
      }

      // Cartesia 特殊处理：将 generation_config.speed 从字符串转换为数字，并限制范围
      if (config.templateType === 'cartesia') {
        if (requestBody.generation_config && requestBody.generation_config.speed !== undefined) {
          let speedValue = parseFloat(requestBody.generation_config.speed);
          if (!isNaN(speedValue)) {
            // Cartesia Sonic3 的 speed 范围是 0.6 到 1.5
            speedValue = Math.max(0.6, Math.min(1.5, speedValue));
            requestBody.generation_config.speed = speedValue;
            console.log('✅ Cartesia: generation_config.speed =', speedValue);
          }
        }
        // 向后兼容：如果使用旧的 speed 字段，转换为 generation_config
        else if (requestBody.speed !== undefined) {
          let speedValue = parseFloat(requestBody.speed);
          if (!isNaN(speedValue)) {
            speedValue = Math.max(0.6, Math.min(1.5, speedValue));
            requestBody.generation_config = { speed: speedValue };
            delete requestBody.speed;
            console.log('✅ Cartesia: 已将 speed 转换为 generation_config.speed =', speedValue);
          }
        }
      }

      // Minimax HTTP 特殊处理（根据官方文档格式）
      if (config.templateType === 'minimax' && config.protocol === 'http') {
        // 1. 处理 voice_setting 对象中的 speed（官方使用 speed，不是 speed_ratio）
        if (requestBody.voice_setting && typeof requestBody.voice_setting === 'object') {
          if (requestBody.voice_setting.speed !== undefined) {
            const speedValue = typeof requestBody.voice_setting.speed === 'string' 
              ? parseFloat(requestBody.voice_setting.speed)
              : Number(requestBody.voice_setting.speed);
            if (!isNaN(speedValue)) {
              requestBody.voice_setting.speed = speedValue;
              console.log('✅ Minimax HTTP: voice_setting.speed 转换为数字', speedValue);
            }
          }
          // 确保 vol 和 pitch 是数字
          if (requestBody.voice_setting.vol !== undefined) {
            requestBody.voice_setting.vol = Number(requestBody.voice_setting.vol) || 1;
          }
          if (requestBody.voice_setting.pitch !== undefined) {
            requestBody.voice_setting.pitch = Number(requestBody.voice_setting.pitch) || 0;
          }
        }
        
        // 2. 处理旧的扁平格式（向后兼容，如果模板还是旧格式）
        if (requestBody.speed_ratio !== undefined && !requestBody.voice_setting) {
          console.warn('⚠️ Minimax HTTP: 检测到旧格式（speed_ratio），建议使用 voice_setting 格式');
          const speedValue = typeof requestBody.speed_ratio === 'string' 
            ? parseFloat(requestBody.speed_ratio)
            : Number(requestBody.speed_ratio);
          if (!isNaN(speedValue)) {
            // 转换为新格式
            requestBody.voice_setting = {
              voice_id: requestBody.voice_id || 'female-qn-qingqing',
              speed: speedValue,
              vol: 1,
              pitch: 0,
            };
            delete requestBody.speed_ratio;
            delete requestBody.voice_id;
            console.log('✅ Minimax HTTP: 已转换为新格式（voice_setting）');
          }
        }
        
        // 3. 添加 language_boost 参数（粤语需要特殊处理）
        console.log('🔍 Minimax HTTP: 检查 language 参数 =', requestBody.language, '类型:', typeof requestBody.language);
        if (requestBody.language && requestBody.language !== 'auto' && requestBody.language !== 'undefined') {
          const langMap: Record<string, string> = {
            'zh': 'Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'es': 'Spanish',
            'yue': 'Chinese,Yue', // 粤语使用特殊格式
          };
          const languageBoost = langMap[requestBody.language];
          console.log('🔍 Minimax HTTP: 映射后的 language_boost =', languageBoost);
          if (languageBoost) {
            requestBody.language_boost = languageBoost;
            console.log('✅ Minimax HTTP: 添加 language_boost =', languageBoost);
          }
          // 删除原始的 language 字段（Minimax API 不需要）
          delete requestBody.language;
        } else {
          console.log('⚠️ Minimax HTTP: language 参数为空或为 auto，不添加 language_boost');
        }

        // 4. 处理 group_id（保持字符串，避免精度丢失）
        // 注意：大数字（如 1752252004131938307）转换为 Number 会丢失精度
        // 如果代理 API 需要数字类型，可能需要通过其他方式传递
        if (requestBody.group_id !== undefined && typeof requestBody.group_id === 'string') {
          const cleanGroupId = requestBody.group_id.trim().replace(/^["']|["']$/g, '');
          // 检查是否是很大的数字（超过 Number.MAX_SAFE_INTEGER）
          const bigIntValue = BigInt(cleanGroupId);
          if (bigIntValue > BigInt(Number.MAX_SAFE_INTEGER)) {
            // 保持字符串，避免精度丢失
            requestBody.group_id = cleanGroupId;
            console.log('✅ Minimax HTTP: group_id 保持字符串（避免精度丢失）:', cleanGroupId);
          } else {
            // 小数字可以安全转换
            const numValue = Number(cleanGroupId);
            if (!isNaN(numValue)) {
              requestBody.group_id = numValue;
              console.log('✅ Minimax HTTP: group_id 转换为数字', numValue);
            }
          }
        }
        
        // 4. 检查是否有空值字段
        const emptyFields: string[] = [];
        const checkEmpty = (obj: any, prefix = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value === null || value === undefined || value === '') {
              emptyFields.push(fullKey);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
              checkEmpty(value, fullKey);
            }
          }
        };
        checkEmpty(requestBody);
        if (emptyFields.length > 0) {
          console.warn('⚠️ Minimax HTTP: 发现空值字段:', emptyFields);
        }
        
        console.log('🔍 Minimax HTTP 最终请求体:', JSON.stringify(requestBody, null, 2));
      }
    } else {
      // 如果没有模板，使用默认格式
      console.warn('⚠️ 警告: config.requestBody 为空，使用默认格式');
      requestBody = {
        model: modelId,
        input: text,
        voice: voiceId,
        response_format: 'wav',
        speed: variables.speed,
      };
    }

    // 3. 构建请求头
    const headers = buildAuthHeaders(config);

    // 4. 构建完整的API URL（如果是OpenAI兼容的TTS，需要添加 /audio/speech 端点）
    let apiUrl = config.apiUrl;
    if (config.templateType === 'openai' && !apiUrl.includes('/audio/')) {
      // 如果是OpenAI风格且URL是基础URL，自动添加TTS端点
      if (apiUrl.endsWith('/v1') || apiUrl.endsWith('/v1/')) {
        apiUrl = apiUrl.replace(/\/v1\/?$/, '/v1/audio/speech');
      }
    }

    // 调试日志
    console.log('=== TTS API 调用信息 ===');
    console.log('API URL:', apiUrl);
    console.log('认证类型:', config.authType);
    console.log('模型:', modelId);
    console.log('音色:', voiceId);
    console.log('请求头:', JSON.stringify(headers, null, 2));
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    // 5. 发送请求
    const response = await fetch(apiUrl, {
      method: config.method,
      headers,
      body: JSON.stringify(requestBody),
    });
    
    // 读取响应流，并在首个chunk到达时记录TTFB
    let audioBuffer: Buffer;
    const contentType = response.headers.get('content-type') || '';
    console.log('响应 Content-Type:', contentType);
    console.log('响应状态:', response.status, response.statusText);

    let responseBodyBuffer: Buffer | null = null;
    let ttfbRecorded = false;

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          if (!ttfbRecorded) {
            ttfb = Date.now() - startTime;
            ttfbRecorded = true;
            console.log('TTFB (首字节耗时):', ttfb, 'ms');
          }
          chunks.push(Buffer.from(value));
        }
      }
      responseBodyBuffer = Buffer.concat(chunks);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      responseBodyBuffer = Buffer.from(arrayBuffer);
    }

    if (!ttfbRecorded) {
      ttfb = Date.now() - startTime;
      console.log('TTFB (首字节耗时 - fallback):', ttfb, 'ms');
    }

    if (!responseBodyBuffer) {
      responseBodyBuffer = Buffer.alloc(0);
    }

    if (contentType.includes('application/json')) {
      // JSON响应，需要从响应中提取音频
      const responseText = responseBodyBuffer.toString('utf-8');
      let responseData: any = {};
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (error: any) {
        console.error('JSON 解析失败:', error.message);
        throw new Error(`响应解析失败: ${error.message}`);
      }
      console.log('响应数据（前500字符）:', JSON.stringify(responseData).substring(0, 500));
      
      // 检查 Minimax HTTP API 的错误响应格式
      if (config.templateType === 'minimax' && config.protocol === 'http') {
        const baseResp = responseData.base_resp;
        if (baseResp && baseResp.status_code !== 0 && baseResp.status_code !== 200) {
          const errorMsg = baseResp.status_msg || `错误码: ${baseResp.status_code}`;
          console.error('Minimax HTTP API 错误:', JSON.stringify(responseData, null, 2));
          throw new Error(`Minimax API 调用失败: ${errorMsg}`);
        }
      }

      if (!response.ok) {
        console.error('API 调用失败，完整响应:', JSON.stringify(responseData, null, 2));
        const errorMessage = config.errorPath
          ? getValueByPath(responseData, config.errorPath) || response.statusText
          : response.statusText;
        throw new Error(`API调用失败: ${errorMessage}`);
      }
      
      // 提取音频数据
      console.log('尝试从路径提取音频:', config.responseAudioPath);
      const audioData = config.responseAudioPath
        ? getValueByPath(responseData, config.responseAudioPath)
        : responseData.audio || responseData.data?.audio || responseData.output?.audio?.data;
      
      console.log('提取的音频数据长度:', audioData ? (typeof audioData === 'string' ? audioData.length : '非字符串') : 'null');
      
      // Qwen API特殊处理：如果data为空，尝试从url字段获取
      if (!audioData || (typeof audioData === 'string' && audioData.trim() === '')) {
        console.log('⚠️ audio.data为空，尝试从audio.url获取');
        const audioUrl = getValueByPath(responseData, 'output.audio.url') || 
                        responseData.output?.audio?.url ||
                        responseData.audio?.url;
        
        if (audioUrl) {
          console.log('从 URL 获取音频:', audioUrl);
          try {
            const audioResponse = await fetch(audioUrl, {
              method: 'GET',
              // 添加超时和重试机制
              signal: AbortSignal.timeout(30000), // 30秒超时
            });
            console.log('音频下载响应状态:', audioResponse.status, audioResponse.statusText);
            console.log('音频下载响应头:', Object.fromEntries(audioResponse.headers.entries()));

            if (!audioResponse.ok) {
              const errorText = await audioResponse.text();
              console.error('音频下载失败响应:', errorText);
              throw new Error(`从URL下载音频失败: ${audioResponse.status} ${audioResponse.statusText}`);
            }

            const arrayBuffer = await audioResponse.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuffer);
            console.log('从 URL 获取音频成功，大小:', audioBuffer.length, 'bytes');
            console.log('✅ 音频下载完成，准备返回结果');
          } catch (error: any) {
            console.error('从URL下载音频失败，详细错误:', {
              name: error.name,
              message: error.message,
              cause: error.cause,
              stack: error.stack?.split('\n').slice(0, 3).join('\n'),
            });
            throw new Error(`从URL下载音频失败: ${error.message} (${error.name})`);
          }
        } else {
          console.error('无法提取音频数据，完整响应结构:', JSON.stringify(responseData, null, 2));
          throw new Error('无法从响应中提取音频数据，请检查responseAudioPath配置。响应结构已输出到控制台。');
        }
      } else {
        // 根据格式解码
        if (config.responseAudioFormat === 'base64') {
          try {
            audioBuffer = Buffer.from(audioData, 'base64');
            console.log('Base64 解码成功，音频大小:', audioBuffer.length, 'bytes');
          } catch (error) {
            console.error('Base64 解码失败:', error);
            throw new Error(`Base64 解码失败: ${error}`);
          }
        } else if (config.responseAudioFormat === 'hex') {
          // Minimax HTTP API 使用 hex 编码（根据官方文档）
          try {
            // 移除可能的 0x 前缀和空格
            const cleanHex = typeof audioData === 'string' 
              ? audioData.replace(/^0x/i, '').replace(/\s/g, '')
              : String(audioData).replace(/^0x/i, '').replace(/\s/g, '');
            audioBuffer = Buffer.from(cleanHex, 'hex');
            console.log('Hex 解码成功，音频大小:', audioBuffer.length, 'bytes');
          } catch (error) {
            console.error('Hex 解码失败:', error);
            throw new Error(`Hex 解码失败: ${error}`);
          }
        } else if (config.responseAudioFormat === 'url') {
          // 如果是URL，需要再次请求
          console.log('从 URL 获取音频:', audioData);
          const audioResponse = await fetch(audioData);
          audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
          console.log('从 URL 获取音频成功，大小:', audioBuffer.length, 'bytes');
        } else {
          // 假设是二进制数据
          audioBuffer = Buffer.from(audioData);
          console.log('直接使用二进制数据，大小:', audioBuffer.length, 'bytes');
        }
      }
    } else {
      // 直接返回音频文件
      if (!response.ok) {
        const errorText = responseBodyBuffer.toString('utf-8') || `${response.status}`;
        console.error('API错误响应:', errorText);
        throw new Error(`API调用失败: ${response.statusText} - ${errorText}`);
      }
      audioBuffer = responseBodyBuffer;
      console.log('音频数据大小:', audioBuffer.length, 'bytes');
    }

    const totalTime = Date.now() - startTime;
    const duration = totalTime / 1000;

    console.log('🎉 TTS 调用成功，准备返回结果');
    console.log('音频大小:', audioBuffer!.length, 'bytes');
    console.log('总耗时:', totalTime, 'ms');
    console.log('TTFB (首字节耗时):', ttfb, 'ms');

    return {
      audioBuffer,
      duration,
      ttfb,
      totalTime,
      format: 'wav', // 统一使用 WAV 格式
      modelId,
      characterCount,
    };
  } catch (error: any) {
    console.error('❌ TTS 调用失败，错误:', error.message);
    throw new Error(`通用TTS API调用失败: ${error.message}`);
  }
}

/**
 * 调用 Minimax TTS API（WebSocket 流式接口）
 */
export async function callMinimaxTTS(
  config: GenericProviderConfig,
  text: string,
  options?: TTSOptions
): Promise<TTSResult> {
  const startTime = Date.now();
  const modelId = getModelId(config, 'tts');
  const originalCharacterCount = text.length;
  
  return new Promise((resolve, reject) => {
    // 检查必需字段
    if (!config.appId || !config.apiKey) {
      reject(new Error('Minimax 需要 appId 和 apiKey（token）'));
      return;
    }

    // 限制文本长度
    if (text.length > 300) {
      console.warn(`⚠️ 文本长度超过 300 字符（${text.length}），将被截断`);
      text = text.substring(0, 300);
    }

    const ws = new WebSocket(config.apiUrl);
    const audioChunks: Buffer[] = [];
    let hasError = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let ttfbValue: number | null = null;
    let firstChunkReceived = false;

    // 清理函数
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    // 超时控制（30秒）
    timeoutId = setTimeout(() => {
      if (!hasError) {
        hasError = true;
        cleanup();
        reject(new Error('Minimax TTS 请求超时（30秒）'));
      }
    }, 30000);

    // 连接建立
    ws.on('open', () => {
      try {
        // 生成用户 ID
        const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // 构建 language_boost 参数（粤语需要特殊处理）
        let languageBoost: string | undefined;
        if (options?.language === 'yue') {
          languageBoost = 'Chinese,Yue'; // 粤语使用特殊格式
        } else if (options?.language && options.language !== 'auto') {
          // 其他语言可以直接使用语言代码
          const langMap: Record<string, string> = {
            'zh': 'Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'es': 'Spanish',
          };
          languageBoost = langMap[options.language];
        }

        const request: any = {
          app: {
            appid: config.appId,
            token: config.apiKey,
          },
          user: {
            uid: uid,
          },
          content: {
            text: text,
            model: getModelId(config, 'tts') || 'speech-01-turbo', // 从配置获取模型，支持所有模型
            voice_setting: {
              voice_id: options?.voice || 'female-qn-qingqing', // 默认音色
              speed_ratio: options?.speed || 1.0,
              pitch_ratio: 1.0,
              volume_ratio: 1.0,
              encoding: 'wav',
              sample_rate: 24000,
            },
          },
        };

        // 添加 language_boost 参数（如果指定了语言）
        if (languageBoost) {
          request.content.language_boost = languageBoost;
        }

        console.log('=== Minimax WebSocket TTS 开始 ===');
        console.log('音色:', request.content.voice_setting.voice_id);
        console.log('语速:', request.content.voice_setting.speed_ratio);
        console.log('语言增强:', languageBoost || '未指定（自动检测）');
        console.log('文本长度:', text.length);

        ws.send(JSON.stringify(request));
      } catch (error: any) {
        hasError = true;
        cleanup();
        reject(new Error(`发送请求失败: ${error.message}`));
      }
    });

    // 接收消息
    ws.on('message', (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());

        // 检查错误码
        if (response.code !== 0) {
          hasError = true;
          cleanup();
          reject(new Error(`Minimax API 错误 [${response.code}]: ${response.msg || '未知错误'}`));
          return;
        }

        const status = response.status;

        if (status === 1) {
          // 开始消息
          console.log('✅ Minimax TTS 开始合成');
        } else if (status === 2) {
          // 音频数据块
          if (response.data?.audio) {
            const audioChunk = Buffer.from(response.data.audio, 'base64');
            audioChunks.push(audioChunk);
            if (!firstChunkReceived) {
              ttfbValue = Date.now() - startTime;
              firstChunkReceived = true;
              console.log('TTFB (首块音频耗时):', ttfbValue, 'ms');
            }
            console.log(`📦 接收音频块: ${audioChunk.length} bytes (总计: ${audioChunks.length} 块)`);
          }
        } else if (status === 3) {
          // 结束消息
          console.log('✅ Minimax TTS 合成完成');
          console.log('总音频块数:', audioChunks.length);
          console.log('API 返回时长:', response.data?.duration, 'ms');

          // 拼接所有音频 chunk
          const audioBuffer = Buffer.concat(audioChunks);
          const totalTime = Date.now() - startTime;
          const duration = totalTime / 1000;
          if (ttfbValue == null) {
            ttfbValue = totalTime;
          }

          console.log('🎉 音频拼接完成，总大小:', audioBuffer.length, 'bytes');
          console.log('总耗时:', totalTime, 'ms');

          cleanup();
          resolve({
            audioBuffer,
            duration,
            ttfb: ttfbValue,
            totalTime,
            format: 'wav',
            modelId,
            characterCount: Math.min(originalCharacterCount, 300),
          });
        }
      } catch (error: any) {
        hasError = true;
        cleanup();
        reject(new Error(`解析响应失败: ${error.message}`));
      }
    });

    // 错误处理
    ws.on('error', (error) => {
      if (!hasError) {
        hasError = true;
        cleanup();
        reject(new Error(`WebSocket 连接错误: ${error.message}`));
      }
    });

    // 连接关闭
    ws.on('close', (code, reason) => {
      if (!hasError && audioChunks.length === 0) {
        // 如果没有收到任何数据就关闭了，视为错误
        hasError = true;
        cleanup();
        reject(new Error(`WebSocket 连接异常关闭 [${code}]: ${reason || '无原因'}`));
      }
    });
  });
}

/**
 * 调用 Azure TTS API（使用 SSML 格式）
 */
export async function callAzureTTS(
  config: GenericProviderConfig,
  text: string,
  options?: TTSOptions
): Promise<TTSResult> {
  const startTime = Date.now();
  const modelId = getModelId(config, 'tts');
  const characterCount = text.length;
  let ttfb: number | null = null;

  try {
    // 1. 准备参数
    const voiceId = getVoiceId(config, options?.voice);

    // 语言映射（Azure 使用 BCP-47 格式）
    const languageMap: Record<string, string> = {
      'zh': 'zh-CN',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ru': 'ru-RU',
      'yue': 'zh-HK',
    };

    const language = options?.language || 'zh';
    const xmlLang = languageMap[language] || 'zh-CN';

    // 2. 构建 SSML 请求体
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xmlLang}">
    <voice name="${voiceId}">
        ${text}
    </voice>
</speak>`;

    console.log('=== Azure TTS API 调用信息 ===');
    console.log('音色:', voiceId);
    console.log('语言:', xmlLang);
    console.log('文本长度:', text.length);
    console.log('SSML:', ssml);

    // 3. 构建 API URL（将 ASR 端点替换为 TTS 端点）
    // ASR: https://{region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe
    // TTS: https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
    let apiUrl = config.apiUrl;

    // 提取 region
    const regionMatch = apiUrl.match(/https:\/\/([^.]+)\./);
    const region = regionMatch ? regionMatch[1] : 'eastus';

    // 构建 TTS 端点
    apiUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    console.log('TTS API URL:', apiUrl);
    console.log('Region:', region);

    // 4. 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', // WAV 格式
      'Ocp-Apim-Subscription-Key': config.apiKey || '',
    };

    console.log('请求头:', JSON.stringify(headers, null, 2));

    // 5. 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: ssml,
    });

    console.log('响应状态:', response.status, response.statusText);
    console.log('响应 Content-Type:', response.headers.get('content-type'));

    // 6. 处理响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure TTS API 错误:', errorText);
      throw new Error(`Azure TTS API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // 读取音频流
    let audioBuffer: Buffer;
    let ttfbRecorded = false;

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          if (!ttfbRecorded) {
            ttfb = Date.now() - startTime;
            ttfbRecorded = true;
            console.log('TTFB (首字节耗时):', ttfb, 'ms');
          }
          chunks.push(Buffer.from(value));
        }
      }
      audioBuffer = Buffer.concat(chunks);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    if (!ttfbRecorded) {
      ttfb = Date.now() - startTime;
    }

    const totalTime = Date.now() - startTime;
    const duration = totalTime / 1000;

    console.log('🎉 Azure TTS 调用成功');
    console.log('音频大小:', audioBuffer.length, 'bytes');
    console.log('总耗时:', totalTime, 'ms');
    console.log('TTFB:', ttfb, 'ms');

    return {
      audioBuffer,
      duration,
      ttfb,
      totalTime,
      format: 'wav',
      modelId,
      characterCount,
    };
  } catch (error: any) {
    console.error('❌ Azure TTS 调用失败:', error.message);
    throw new Error(`Azure TTS API调用失败: ${error.message}`);
  }
}
