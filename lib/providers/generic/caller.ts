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
  // 1. 优先使用自定义模型
  if (config.customModels?.[serviceType]) {
    return config.customModels[serviceType];
  }

  // 2. 使用用户选择的模型
  if (config.selectedModels?.[serviceType]) {
    return config.selectedModels[serviceType];
  }

  // 3. 使用模板默认模型
  if (config.templateType) {
    // 先尝试从内置模板获取（同步，向后兼容）
    const builtinTemplate = templates[config.templateType as keyof typeof templates];
    if (builtinTemplate?.defaultModel?.[serviceType]) {
      return builtinTemplate.defaultModel[serviceType];
    }
    // 如果是自定义模板，需要异步加载（这里先返回默认值，实际应该在调用前加载）
  }

  // 4. 回退到硬编码默认值
  if (serviceType === 'asr') {
    return config.templateType === 'openai' ? 'whisper-1' : 'default';
  } else {
    return config.templateType === 'openai' ? 'gpt-4o-mini-tts' : 'default';
  }
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

  // 移除未替换的变量（可选，也可以保留）
  // result = result.replace(/\{[^}]+\}/g, '');

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

  // Cartesia 特殊处理：添加 Cartesia-Version header
  if (config.templateType === 'cartesia') {
    headers['Cartesia-Version'] = '2024-06-30';
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

    const variables: RequestVariables = {
      audio: audioBase64,
      audioBase64: audioBase64,
      audio_url: audioBase64, // Qwen API使用audio_url字段，但实际传入base64数据
      language: options?.language || 'zh',
      format: options?.format || 'wav',
      model: modelId,
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

    // Qwen风格：ASR使用专门的语音识别端点
    if (config.templateType === 'qwen') {
      // Qwen ASR 使用 /services/audio/asr/recognition 端点
      apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/recognition';
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

      if (options?.language) {
        formData.append('language', options.language);
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
      console.log('语言:', options?.language);
      console.log('格式:', options?.format);
      console.log('音频大小:', audioBuffer.length, 'bytes');

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: formData,
      });
    } else {
      // 其他API使用JSON格式
      let requestBody: any;

      // 获取ASR专用的请求体模板
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
          language: variables.language,
          format: variables.format,
        };
      }

      // 构建请求头
      const headers = buildAuthHeaders(config);

      console.log('=== ASR API 调用信息 ===');
      console.log('API URL:', apiUrl);
      console.log('模型:', modelId);
      console.log('请求体（前500字符）:', JSON.stringify(requestBody).substring(0, 500));

      response = await fetch(apiUrl, {
        method: config.method,
        headers,
        body: JSON.stringify(requestBody),
      });
    }

    // 4. 解析响应
    const responseData = await response.json();

    console.log('响应状态:', response.status, response.statusText);
    console.log('响应数据（前500字符）:', JSON.stringify(responseData).substring(0, 500));

    if (!response.ok) {
      const errorMessage = config.errorPath
        ? getValueByPath(responseData, config.errorPath) || response.statusText
        : response.statusText;
      throw new Error(`API调用失败: <${response.status}> ${errorMessage}`);
    }

    // 5. 提取文本
    const text = config.responseTextPath
      ? getValueByPath(responseData, config.responseTextPath)
      : responseData.text || responseData.result?.text || '';

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

    // 1. 准备变量
    const modelId = getModelId(config, 'tts');
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
    };
    const language = options?.language ?? 'zh';
    const languageType = languageTypeMap[language] || 'Chinese';

    const variables: RequestVariables = {
      text,
      model: modelId,
      voice: voiceId,
      speed: options?.speed !== undefined ? options.speed : 1.0,
      language: language,
      language_type: languageType, // Qwen3-TTS 需要的语言类型
      format: 'mp3', // 默认格式
    };
    
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

      // Cartesia 特殊处理：将 speed 从字符串转换为数字
      if (config.templateType === 'cartesia' && requestBody.speed !== undefined) {
        const speedValue = parseFloat(requestBody.speed);
        if (!isNaN(speedValue)) {
          requestBody.speed = 1;
          console.log('✅ Cartesia: 测试使用 speed = 0.5 (原始值为', speedValue, ')');
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
        
        // 3. 处理 group_id（保持字符串，避免精度丢失）
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
        response_format: 'mp3',
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

    // 5. 处理响应
    let audioBuffer: Buffer;

    // 检查Content-Type
    const contentType = response.headers.get('content-type') || '';
    console.log('响应 Content-Type:', contentType);
    console.log('响应状态:', response.status, response.statusText);

    if (contentType.includes('application/json')) {
      // JSON响应，需要从响应中提取音频
      const responseData = await response.json();
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
        // 尝试读取错误信息
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        throw new Error(`API调用失败: ${response.statusText} - ${errorText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      console.log('音频数据大小:', audioBuffer.length, 'bytes');
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log('🎉 TTS 调用成功，准备返回结果，音频大小:', audioBuffer!.length, 'bytes');

    return {
      audioBuffer,
      duration,
      format: 'mp3', // 默认格式，实际应该从响应或配置中获取
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
        const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const request = {
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
              encoding: 'mp3',
              sample_rate: 24000,
            },
          },
        };

        console.log('=== Minimax WebSocket TTS 开始 ===');
        console.log('音色:', request.content.voice_setting.voice_id);
        console.log('语速:', request.content.voice_setting.speed_ratio);
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
            console.log(`📦 接收音频块: ${audioChunk.length} bytes (总计: ${audioChunks.length} 块)`);
          }
        } else if (status === 3) {
          // 结束消息
          console.log('✅ Minimax TTS 合成完成');
          console.log('总音频块数:', audioChunks.length);
          console.log('API 返回时长:', response.data?.duration, 'ms');

          // 拼接所有音频 chunk
          const audioBuffer = Buffer.concat(audioChunks);
          const duration = (Date.now() - startTime) / 1000;

          console.log('🎉 音频拼接完成，总大小:', audioBuffer.length, 'bytes');

          cleanup();
          resolve({
            audioBuffer,
            duration,
            format: 'mp3',
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
