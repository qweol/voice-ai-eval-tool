/**
 * 通用API调用器的类型定义
 */

export type AuthType = 'bearer' | 'apikey' | 'custom';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export type TemplateType = 'openai' | 'qwen' | 'doubao' | 'custom';

/**
 * 音色定义
 */
export interface VoiceDefinition {
  id: string; // 音色ID，如 'alloy'
  name: string; // 显示名称，如 'Alloy'
  description?: string; // 音色描述
  gender?: 'male' | 'female' | 'neutral'; // 性别
  language?: string; // 主要语言
  previewUrl?: string; // 试听URL（可选）
}

/**
 * 模型定义
 */
export interface ModelDefinition {
  id: string; // 模型ID，如 'whisper-1'
  name: string; // 显示名称，如 'Whisper V1'
  description?: string; // 模型描述
  type: 'asr' | 'tts'; // 模型类型

  // TTS特有字段
  voices?: VoiceDefinition[]; // 支持的音色列表
  supportedFormats?: string[]; // 支持的音频格式
  speedRange?: [number, number]; // 语速范围，如 [0.25, 4.0]

  // ASR特有字段
  supportedLanguages?: string[]; // 支持的语言代码
  maxFileSize?: number; // 最大文件大小（字节）
}

/**
 * 通用API提供者配置
 */
export interface GenericProviderConfig {
  id: string; // 唯一ID
  name: string; // 用户自定义名称
  type: 'generic'; // 类型标识
  serviceType: 'asr' | 'tts' | 'both'; // 支持的服务类型
  
  // API配置
  apiUrl: string; // API地址
  method: HTTPMethod; // HTTP方法
  
  // 认证配置
  authType: AuthType;
  apiKey?: string; // API密钥
  authHeader?: string; // 自定义认证头，如 "Authorization: Bearer {api_key}"
  
  // 请求配置
  requestBody?: string; // 请求体模板（JSON字符串，支持变量）
  requestHeaders?: Record<string, string>; // 额外的请求头
  
  // 响应解析配置
  responseTextPath?: string; // ASR响应中文本的路径，如 "result.text" 或 "text"
  responseAudioPath?: string; // TTS响应中音频的路径，如 "result.audio" 或 "audio"
  responseAudioFormat?: 'base64' | 'url' | 'binary' | 'stream'; // 音频格式
  
  // 错误处理
  errorPath?: string; // 错误信息的路径，如 "error.message"
  
  // 模板类型（用于预设模板）
  templateType?: TemplateType;

  // 模型选择
  selectedModels?: {
    asr?: string; // 选择的ASR模型ID
    tts?: string; // 选择的TTS模型ID
  };

  // 音色选择
  selectedVoice?: string; // 选择的音色ID

  // 自定义模型（当allowCustomModel=true时）
  customModels?: {
    asr?: string;
    tts?: string;
  };

  // 启用状态
  enabled: boolean;
}

/**
 * 提供者配置（现在只有通用API）
 */
export type ProviderConfig = GenericProviderConfig;

/**
 * 请求变量映射
 */
export interface RequestVariables {
  text?: string; // TTS文本
  audio?: string; // ASR音频（base64编码）
  audioBase64?: string; // ASR音频（base64编码，别名）
  model?: string; // 模型名称
  language?: string; // 语言
  format?: string; // 格式
  speed?: number; // 语速
  volume?: number; // 音量
  pitch?: number; // 音调
  voice?: string; // 音色
  [key: string]: any; // 其他自定义变量
}

/**
 * 模板定义
 */
export interface APITemplate {
  id: TemplateType;
  name: string;
  description: string;
  defaultApiUrl: string;
  defaultMethod: HTTPMethod;
  authType: AuthType;
  requestBodyTemplate: {
    asr?: string; // ASR请求体模板
    tts?: string; // TTS请求体模板
  };
  responseTextPath?: string;
  responseAudioPath?: string;
  responseAudioFormat?: 'base64' | 'url' | 'binary' | 'stream';
  errorPath?: string;
  variables?: {
    description: string;
    required: boolean;
    default?: any;
  }[];

  // 新增：预设模型列表
  models?: ModelDefinition[];

  // 新增：是否允许自定义模型
  allowCustomModel?: boolean;

  // 新增：默认模型
  defaultModel?: {
    asr?: string; // 默认ASR模型ID
    tts?: string; // 默认TTS模型ID
  };
}
