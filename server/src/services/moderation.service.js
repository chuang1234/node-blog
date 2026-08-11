/**
 * 内容审核服务
 *
 * 两级审核策略：
 * 1. 本地敏感词匹配（快、零成本、规则可在后台自定义）
 *    - level 3：直接拦截
 *    - level 2：替换为 ***
 *    - level 1：仅标记提示
 * 2. AI 语义审核（识别变体、谐音、软广等规则匹配不到的情况）
 *
 * 两级结果合并后返回统一结构。
 */
const sensitiveWordDao = require('../dao/sensitiveWord.dao');
const aiConfigService = require('./aiConfig.service');
const ai = require('../ai');
const logger = require('../utils/logger');

// 敏感词表缓存（5 分钟）
let wordCache = null;
let wordCacheTime = 0;
const WORD_TTL = 5 * 60 * 1000;

async function getWords(force = false) {
  if (!force && wordCache && Date.now() - wordCacheTime < WORD_TTL) return wordCache;
  try {
    wordCache = await sensitiveWordDao.findEnabled();
    wordCacheTime = Date.now();
  } catch (err) {
    logger.warn(`敏感词加载失败: ${err.message}`);
    wordCache = wordCache || [];
  }
  return wordCache;
}

function invalidateWords() {
  wordCache = null;
  wordCacheTime = 0;
}

/**
 * 本地敏感词扫描
 * @returns {{hits: Array, maxLevel: number, masked: string}}
 */
async function scanLocal(text) {
  const words = await getWords();
  const hits = [];
  let masked = text;
  let maxLevel = 0;

  for (const w of words) {
    if (!w.word) continue;
    if (text.includes(w.word)) {
      hits.push({ word: w.word, category: w.category, level: w.level });
      maxLevel = Math.max(maxLevel, w.level);
      if (w.level >= 2) {
        masked = masked.split(w.word).join('*'.repeat(w.word.length));
      }
    }
  }
  return { hits, maxLevel, masked };
}

/**
 * 完整审核（本地规则 + AI 语义）
 * @param {string} text 待审内容
 * @param {{useAi?: boolean, userId?: number, scene?: string}} options
 * @returns {Promise<{pass: boolean, level: 'safe'|'medium'|'high', risks: Array, masked: string, suggestion: string, aiChecked: boolean}>}
 */
async function moderate(text, options = {}) {
  const content = String(text || '');
  if (!content.trim()) {
    return { pass: true, level: 'safe', risks: [], masked: content, suggestion: '', aiChecked: false };
  }

  // 第一级：本地敏感词
  const local = await scanLocal(content);
  const risks = local.hits.map((h) => ({
    type: h.category,
    desc: `命中敏感词「${h.word}」(级别 ${h.level})`,
    source: 'rule',
  }));

  // level 3 直接拦截，不必再调 AI，节省成本
  if (local.maxLevel >= 3) {
    return {
      pass: false,
      level: 'high',
      risks,
      masked: local.masked,
      suggestion: '内容包含明确违规词汇，请修改后重新提交',
      aiChecked: false,
    };
  }

  // 第二级：AI 语义审核
  const useAi = options.useAi !== false && (await aiConfigService.getBoolean('ai.auto_moderate', true));
  let aiChecked = false;

  if (useAi) {
    try {
      const level = await aiConfigService.getNumber('ai.moderate_level', 2);
      const prompt = ai.prompts.moderate({ text: content, level });
      const result = await ai.invoke('moderate', prompt, { userId: options.userId, json: true, temperature: 0.1 });
      const parsed = ai.parseJson(result.content, { pass: true, level: 'safe', risks: [] });
      aiChecked = true;

      if (Array.isArray(parsed.risks)) {
        for (const r of parsed.risks) {
          risks.push({ type: r.type || 'other', desc: r.desc || 'AI 识别到潜在风险', source: 'ai' });
        }
      }
      if (parsed.pass === false) {
        return {
          pass: false,
          level: parsed.level || 'medium',
          risks,
          masked: local.masked,
          suggestion: parsed.suggestion || '内容可能存在合规风险，请修改后重试',
          aiChecked,
        };
      }
    } catch (err) {
      // AI 审核失败不阻断发布，仅记录（避免 AI 故障导致业务瘫痪）
      logger.warn(`AI 审核失败，仅使用本地规则结果: ${err.message}`);
    }
  }

  // level 2：替换后放行；level 1：提示但放行
  return {
    pass: true,
    level: local.maxLevel >= 2 ? 'medium' : risks.length ? 'medium' : 'safe',
    risks,
    masked: local.masked,
    suggestion: risks.length ? '内容中的个别词汇已被处理，建议自查后发布' : '',
    aiChecked,
  };
}

module.exports = { moderate, scanLocal, invalidateWords, getWords };
