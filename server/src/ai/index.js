/**
 * AI 能力统一入口
 *
 * 职责：
 * 1. 根据配置选择 Provider（支持后台动态切换，无需重启）
 * 2. 统一注入 Prompt 模板
 * 3. 统一记录调用日志（用量、耗时、成败）
 * 4. 统一异常兜底：真实模型调用失败时自动降级到 Mock，保证业务不中断
 * 5. 解析模型返回的 JSON（容忍模型输出的 ```json 包裹）
 */
const OpenAICompatibleProvider = require('./providers/openai.provider');
const MockProvider = require('./providers/mock.provider');
const { prompts } = require('./prompts');
const config = require('../config');
const logger = require('../utils/logger');
const aiLogDao = require('../dao/aiLog.dao');
const aiConfigService = require('../services/aiConfig.service');

const mockProvider = new MockProvider();

/** Provider 实例缓存，避免重复创建 axios 实例 */
const providerCache = new Map();

/**
 * 获取当前生效的 Provider
 * 优先级：后台 ai_configs 配置 > 环境变量；未配置 Key 时回退 Mock
 */
async function resolveProvider() {
  const name = await aiConfigService.getString('ai.provider', config.ai.provider);

  if (name === 'mock') return mockProvider;

  if (providerCache.has(name)) {
    const cached = providerCache.get(name);
    if (cached.isConfigured()) return cached;
  }

  let instance = null;
  switch (name) {
    case 'openai':
      instance = new OpenAICompatibleProvider(config.ai.openai, 'openai');
      break;
    case 'qwen':
      instance = new OpenAICompatibleProvider(config.ai.qwen, 'qwen');
      break;
    case 'ernie':
      instance = new OpenAICompatibleProvider(config.ai.ernie, 'ernie');
      break;
    case 'deepseek':
      instance = new OpenAICompatibleProvider(config.ai.deepseek, 'deepseek');
      break;
    default:
      logger.warn(`未知的 AI Provider "${name}"，已回退到 mock`);
      return mockProvider;
  }

  if (!instance.isConfigured()) {
    logger.warn(`Provider "${name}" 缺少 API Key，本次调用降级到 mock`);
    return mockProvider;
  }

  providerCache.set(name, instance);
  return instance;
}

/** 清空 Provider 缓存（后台修改配置后调用） */
function resetProviderCache() {
  providerCache.clear();
}

/**
 * 解析模型返回的 JSON
 * 兼容模型输出 ```json ... ``` 包裹或前后带解释文字的情况
 */
function parseJson(text, fallback = {}) {
  if (!text) return fallback;
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch (e) {
    // 退而求其次：截取第一个 { 到最后一个 }
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch (e2) {
        logger.warn(`AI 返回 JSON 解析失败: ${s.slice(0, 120)}`);
      }
    }
    return fallback;
  }
}

/**
 * 执行一次 AI 调用（带日志与降级）
 * @param {string} action 能力标识，用于日志与 Mock 分派
 * @param {{system: string, user: string}} prompt
 * @param {{userId?: number, temperature?: number, maxTokens?: number, json?: boolean, style?: string, length?: string, tone?: string}} options
 */
async function invoke(action, prompt, options = {}) {
  const enabled = await aiConfigService.getBoolean('ai.enabled', true);
  if (!enabled) {
    const err = new Error('AI 能力已被管理员关闭');
    err.aiDisabled = true;
    throw err;
  }

  const provider = await resolveProvider();
  const temperature = options.temperature ?? (await aiConfigService.getNumber('ai.temperature', 0.7));
  const maxTokens = options.maxTokens ?? (await aiConfigService.getNumber('ai.max_tokens', 2048));
  const model = await aiConfigService.getString('ai.model', '');

  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ];

  const callOptions = {
    temperature,
    maxTokens,
    action,
    json: options.json,
    style: options.style,
    length: options.length,
    tone: options.tone,
  };
  if (model && provider.name !== 'mock') callOptions.model = model;

  const start = Date.now();
  try {
    const result = await provider.chat(messages, callOptions);
    const duration = Date.now() - start;

    // 日志写入失败不应影响主流程
    aiLogDao
      .create({
        userId: options.userId || null,
        action,
        provider: provider.name,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        durationMs: duration,
        status: 'success',
        errorMsg: '',
      })
      .catch(() => {});

    logger.debug(`[AI:${action}] ${provider.name}/${result.model} ${duration}ms`);
    return { ...result, provider: provider.name, durationMs: duration };
  } catch (err) {
    const duration = Date.now() - start;
    aiLogDao
      .create({
        userId: options.userId || null,
        action,
        provider: provider.name,
        model,
        promptTokens: 0,
        completionTokens: 0,
        durationMs: duration,
        status: 'failed',
        errorMsg: String(err.message).slice(0, 480),
      })
      .catch(() => {});

    logger.error(`[AI:${action}] 调用失败: ${err.message}`);

    // 真实模型失败时降级到 Mock，保证用户操作不中断
    if (provider.name !== 'mock') {
      logger.warn(`[AI:${action}] 已降级到内置离线引擎`);
      const fallback = await mockProvider.chat(messages, callOptions);
      return { ...fallback, provider: 'mock(fallback)', durationMs: Date.now() - start, degraded: true };
    }
    throw err;
  }
}

module.exports = { invoke, parseJson, prompts, resolveProvider, resetProviderCache };
