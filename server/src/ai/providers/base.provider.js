/**
 * 大模型 Provider 抽象基类
 *
 * 所有厂商实现统一暴露 chat(messages, options) 接口，
 * 使上层业务完全不感知底层用的是 GPT、通义千问还是文心一言。
 * 新增厂商只需继承本类并实现 chat()，然后在 index.js 中注册。
 */
class BaseProvider {
  /**
   * @param {object} conf 厂商配置 { apiKey, baseUrl, model }
   */
  constructor(conf = {}) {
    this.apiKey = conf.apiKey || '';
    this.baseUrl = conf.baseUrl || '';
    this.model = conf.model || '';
    this.name = 'base';
  }

  /** 是否已完成配置（缺少 Key 时上层会降级到 Mock） */
  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * 发起一次对话补全
   * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
   * @param {{temperature?: number, maxTokens?: number, model?: string, json?: boolean}} options
   * @returns {Promise<{content: string, model: string, usage: {promptTokens: number, completionTokens: number}}>}
   */
  // eslint-disable-next-line no-unused-vars
  async chat(messages, options = {}) {
    throw new Error(`${this.name} Provider 未实现 chat() 方法`);
  }
}

module.exports = BaseProvider;
