/**
 * 通用API调用器
 * 支持调用任意兼容的语音API
 */

import { GenericProviderConfig, RequestVariables } from './types';
import { ASRResult, TTSResult, ASROptions, TTSOptions } from '../../types';
import { templates } from './templates';
import { getTemplate } from './template-loader';

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
      // 对字符串类型的值进行 JSON 转义
      const stringValue = typeof value === 'string'
        ? escapeJsonString(value)
        : String(value);
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
        // 有些服务商使用不同的头名称
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
    // 1. 准备变量
    const modelId = getModelId(config, 'tts');
    const voiceId = getVoiceId(config, options?.voice);

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
            const audioResponse = await fetch(audioUrl);
            if (!audioResponse.ok) {
              throw new Error(`从URL下载音频失败: ${audioResponse.statusText}`);
            }
            audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            console.log('从 URL 获取音频成功，大小:', audioBuffer.length, 'bytes');
          } catch (error: any) {
            console.error('从URL下载音频失败:', error);
            throw new Error(`从URL下载音频失败: ${error.message}`);
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
    
    return {
      audioBuffer,
      duration,
      format: 'mp3', // 默认格式，实际应该从响应或配置中获取
    };
  } catch (error: any) {
    throw new Error(`通用TTS API调用失败: ${error.message}`);
  }
}
