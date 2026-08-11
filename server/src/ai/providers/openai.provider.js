/**
 * OpenAI 兼容协议 Provider
 *
 * 该实现同时适用于所有遵循 /chat/completions 规范的服务：
 * - OpenAI (GPT-4o / GPT-4o-mini ...)
 * - 阿里云通义千问 DashScope 兼容模式
 * - 百度千帆 V2 兼容模式
 * - DeepSeek / Moonshot / 智谱 / 硅基流动 等
 * 因此 qwen、ernie 直接复用本类，只是注入不同的 baseUrl 与 model。
 */
const axios = require('axios');
const BaseProvider = require('./base.provider');
const config = require('../../config');
const logger = require('../../utils/logger');
const { sleep } = require('../../utils/helper');

class OpenAICompatibleProvider extends BaseProvider {
  constructor(conf = {}, name = 'openai') {
    super(conf);
    this.name = name;
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: config.ai.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error(`${this.name} 未配置 API Key，请在 .env 中填写后重试`);
    }

    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    };
    // 要求模型输出 JSON 时开启 JSON mode（部分厂商支持，不支持会被忽略）
    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    const maxRetry = 2;
    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetry; attempt += 1) {
      try {
        const resp = await this.http.post('/chat/completions', body, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        const data = resp.data || {};
        const choice = (data.choices && data.choices[0]) || {};
        const content = (choice.message && choice.message.content) || '';
        if (!content) throw new Error('模型返回内容为空');

        return {
          content: content.trim(),
          model: data.model || body.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
          },
        };
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        const detail = err.response?.data?.error?.message || err.message;
        // 4xx（除 429）属于请求本身的问题，重试无意义
        if (status && status < 500 && status !== 429) {
          throw new Error(`${this.name} 调用失败(${status}): ${detail}`);
        }
        if (attempt < maxRetry) {
          const backoff = 500 * 2 ** attempt;
          logger.warn(`${this.name} 调用失败(${detail})，${backoff}ms 后重试 ${attempt + 1}/${maxRetry}`);
          await sleep(backoff);
        }
      }
    }
    throw new Error(`${this.name} 调用失败: ${lastErr ? lastErr.message : '未知错误'}`);
  }
}

module.exports = OpenAICompatibleProvider;
