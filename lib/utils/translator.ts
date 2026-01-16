/**
 * OpenAI API 翻译集成
 * 用于翻译ASR识别结果
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class Translator {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor(apiKey?: string, apiEndpoint?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    // 优先使用 OPENAI_CHAT_API_URL，如果没有则使用默认值
    this.apiEndpoint = apiEndpoint || process.env.OPENAI_CHAT_API_URL || 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
  }

  /**
   * 翻译文本到中文
   * @param text 要翻译的文本
   * @param targetLang 目标语言，默认为中文
   * @returns 翻译后的文本
   */
  async translate(text: string, targetLang: string = '中文'): Promise<string> {
    if (!text || text.trim() === '') {
      return '';
    }

    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLang}。只返回翻译结果，不要添加任何解释或额外内容。`
        },
        {
          role: 'user',
          content: text
        }
      ];

      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from translation API');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * 批量翻译多个文本
   * @param texts 要翻译的文本数组
   * @param targetLang 目标语言
   * @returns 翻译后的文本数组
   */
  async translateBatch(texts: string[], targetLang: string = '中文'): Promise<string[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // 使用Promise.all并行翻译所有文本
    const promises = texts.map(text => this.translate(text, targetLang));

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Batch translation error:', error);
      throw error;
    }
  }
}

// 单例实例
let translatorInstance: Translator | null = null;

/**
 * 获取翻译器实例
 */
export function getTranslator(): Translator {
  if (!translatorInstance) {
    translatorInstance = new Translator();
  }
  return translatorInstance;
}
