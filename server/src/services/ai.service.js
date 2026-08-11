/**
 * AI Agent 业务服务
 *
 * 把底层模型调用封装为面向业务的能力方法，供控制器直接使用。
 * 每个方法都保证返回结构稳定，即使模型输出异常也有兜底。
 */
const ai = require('../ai');
const aiConfigService = require('./aiConfig.service');
const moderationService = require('./moderation.service');
const blogDao = require('../dao/blog.dao');
const interactionDao = require('../dao/interaction.dao');
const { errors } = require('../utils/response');
const { markdownToText, truncateText } = require('../utils/helper');
const logger = require('../utils/logger');

/** 统一包装 AI 调用异常 */
async function safeInvoke(action, prompt, options) {
  try {
    return await ai.invoke(action, prompt, options);
  } catch (err) {
    if (err.aiDisabled) throw errors.ai('AI 能力已被管理员关闭，请联系站点管理员');
    throw errors.ai(`AI 生成失败：${err.message}`);
  }
}

const aiService = {
  /** 生成博客初稿 */
  async generateDraft({ topic, style, outline, lang = 'zh', userId }) {
    const defaultStyle = await aiConfigService.getString('ai.default_style', 'formal');
    const useStyle = style || defaultStyle;
    const prompt = ai.prompts.draft({ topic, style: useStyle, outline, lang });
    const result = await safeInvoke('draft', prompt, { userId, style: useStyle, temperature: 0.85 });
    return {
      content: result.content,
      style: useStyle,
      provider: result.provider,
      degraded: Boolean(result.degraded),
      durationMs: result.durationMs,
    };
  },

  /** 内容润色 */
  async polish({ content, style, userId }) {
    const defaultStyle = await aiConfigService.getString('ai.default_style', 'formal');
    const useStyle = style || defaultStyle;
    const prompt = ai.prompts.polish({ content, style: useStyle });
    const result = await safeInvoke('polish', prompt, { userId, style: useStyle, temperature: 0.6 });
    return { content: result.content, style: useStyle, provider: result.provider, degraded: Boolean(result.degraded) };
  },

  /** 错别字与语病修正 */
  async proofread({ content, userId }) {
    const prompt = ai.prompts.proofread({ content });
    const result = await safeInvoke('proofread', prompt, { userId, temperature: 0.2 });
    return { content: result.content, provider: result.provider, degraded: Boolean(result.degraded) };
  },

  /** 段落重构 */
  async restructure({ content, userId }) {
    const prompt = ai.prompts.restructure({ content });
    const result = await safeInvoke('restructure', prompt, { userId, temperature: 0.5 });
    return { content: result.content, provider: result.provider, degraded: Boolean(result.degraded) };
  },

  /** 标题优化：返回候选标题数组 */
  async optimizeTitle({ content, count = 5, userId }) {
    const prompt = ai.prompts.title({ content, count });
    const result = await safeInvoke('title', prompt, { userId, json: true, temperature: 0.9 });
    const parsed = ai.parseJson(result.content, {});
    let titles = Array.isArray(parsed.titles) ? parsed.titles : [];

    // 兜底：模型未按 JSON 返回时，按行解析
    if (!titles.length) {
      titles = result.content
        .split('\n')
        .map((l) => l.replace(/^\s*[-*\d.、)]+\s*/, '').trim())
        .filter((l) => l && l.length <= 60)
        .slice(0, count);
    }
    return { titles: titles.slice(0, count), provider: result.provider, degraded: Boolean(result.degraded) };
  },

  /** 智能摘要 */
  async summarize({ content, length = 'medium', userId }) {
    const prompt = ai.prompts.summary({ content, length });
    const result = await safeInvoke('summary', prompt, { userId, length, temperature: 0.4 });
    // 去掉模型可能带上的引号与 Markdown 标记
    const summary = result.content.replace(/^["'「【]|["'」】]$/g, '').replace(/^#+\s*/gm, '').trim();
    return {
      summary: summary.slice(0, 900),
      length,
      provider: result.provider,
      degraded: Boolean(result.degraded),
    };
  },

  /** 关键词提取 */
  async extractKeywords({ content, count = 6, userId }) {
    const prompt = ai.prompts.keywords({ content, count });
    const result = await safeInvoke('keywords', prompt, { userId, json: true, temperature: 0.3 });
    const parsed = ai.parseJson(result.content, {});
    let keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

    if (!keywords.length) {
      keywords = result.content
        .split(/[,，\n]/)
        .map((s) => s.replace(/^\s*[-*\d.、)]+\s*/, '').trim())
        .filter((s) => s && s.length <= 20)
        .slice(0, count);
    }
    return {
      keywords: keywords.slice(0, count).map((k) => String(k).trim()),
      provider: result.provider,
      degraded: Boolean(result.degraded),
    };
  },

  /** 评论智能回复 */
  async replyComment({ blogId, comment, tone, authorName, userId }) {
    const detail = blogId ? await blogDao.findById(blogId) : null;
    const defaultTone = await aiConfigService.getString('ai.reply_tone', 'friendly');

    const prompt = ai.prompts.reply({
      blogTitle: (detail && detail.title) || '（未指定文章）',
      blogSummary: detail ? truncateText(detail.summary || detail.content, 150) : '',
      comment,
      tone: tone || defaultTone,
      authorName: authorName || '博主',
    });
    const result = await safeInvoke('reply', prompt, { userId, tone: tone || defaultTone, temperature: 0.8 });
    return {
      reply: result.content.replace(/^["'「【]|["'」】]$/g, '').trim(),
      tone: tone || defaultTone,
      provider: result.provider,
      degraded: Boolean(result.degraded),
    };
  },

  /**
   * 评论情感分析
   * 失败时返回 unknown，不抛异常（发评论流程不应因情感分析失败而中断）
   */
  async analyzeSentiment({ text, userId }) {
    const enabled = await aiConfigService.getBoolean('ai.sentiment_enabled', true);
    if (!enabled) return { sentiment: 'unknown', score: 0, reason: '情感分析未启用' };

    try {
      const prompt = ai.prompts.sentiment({ text });
      const result = await ai.invoke('sentiment', prompt, { userId, json: true, temperature: 0.1 });
      const parsed = ai.parseJson(result.content, {});
      const valid = ['positive', 'neutral', 'negative'];
      const sentiment = valid.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
      let score = Number(parsed.score);
      if (!Number.isFinite(score)) score = sentiment === 'positive' ? 0.5 : sentiment === 'negative' ? -0.5 : 0;
      score = Math.max(-1, Math.min(1, score));
      return { sentiment, score: Number(score.toFixed(3)), reason: parsed.reason || '' };
    } catch (err) {
      logger.warn(`情感分析失败: ${err.message}`);
      return { sentiment: 'unknown', score: 0, reason: '分析失败' };
    }
  },

  /** 内容审核（代理到 moderation service） */
  async moderate({ content, userId }) {
    return moderationService.moderate(content, { userId });
  },

  /** 创作话题推荐 */
  async suggestTopics({ userId, count = 5 }) {
    let profile = '一位关注技术与产品的中文博客作者';
    if (userId) {
      try {
        const pref = await interactionDao.findUserPreference(userId);
        const cats = pref.categories.map((c) => c.name).join('、');
        const tags = pref.tags.map((t) => t.name).join('、');
        if (cats || tags) {
          profile = `常看分类：${cats || '暂无'}；常见标签：${tags || '暂无'}`;
        }
      } catch (err) {
        logger.warn(`读取用户偏好失败: ${err.message}`);
      }
    }
    const prompt = ai.prompts.topics({ profile, count });
    const result = await safeInvoke('topics', prompt, { userId, json: true, temperature: 0.95 });
    const parsed = ai.parseJson(result.content, {});
    let topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    if (!topics.length) {
      topics = result.content
        .split('\n')
        .map((l) => l.replace(/^\s*[-*\d.、)]+\s*/, '').trim())
        .filter(Boolean)
        .slice(0, count);
    }
    return { topics: topics.slice(0, count), profile, provider: result.provider };
  },

  /**
   * 个性化博客推荐
   * 策略：先用协同规则（浏览过的分类/标签）召回候选，再由 AI 排序。
   * AI 不可用时直接返回规则召回结果，保证功能始终可用。
   */
  async recommendBlogs({ userId, limit = 6 }) {
    // 未登录用户：返回热门内容
    if (!userId) {
      const { list } = await blogDao.findPage({ status: 'published' }, { pageSize: limit, orderBy: 'hot' });
      return { list, strategy: 'hot', reason: '当前展示站点热门内容，登录后可获得个性化推荐' };
    }

    const pref = await interactionDao.findUserPreference(userId);
    const catIds = pref.categories.map((c) => c.id);
    const tagIds = pref.tags.map((t) => t.id);

    // 无行为数据：冷启动走热门
    if (!catIds.length && !tagIds.length) {
      const { list } = await blogDao.findPage({ status: 'published' }, { pageSize: limit, orderBy: 'hot' });
      return { list, strategy: 'cold-start', reason: '你还没有足够的浏览记录，先看看大家都在读什么' };
    }

    // 规则召回：偏好分类 + 偏好标签，排除已读
    const candidates = [];
    const seen = new Set(pref.viewedBlogIds.map(String));

    for (const catId of catIds) {
      const { list } = await blogDao.findPage(
        { status: 'published', categoryId: catId },
        { pageSize: 8, orderBy: 'hot' }
      );
      for (const b of list) {
        if (!seen.has(String(b.id))) {
          candidates.push(b);
          seen.add(String(b.id));
        }
      }
    }
    for (const tagId of tagIds.slice(0, 4)) {
      const { list } = await blogDao.findPage(
        { status: 'published', tagId },
        { pageSize: 6, orderBy: 'hot' }
      );
      for (const b of list) {
        if (!seen.has(String(b.id))) {
          candidates.push(b);
          seen.add(String(b.id));
        }
      }
    }

    if (!candidates.length) {
      const { list } = await blogDao.findPage({ status: 'published' }, { pageSize: limit, orderBy: 'hot' });
      return { list, strategy: 'fallback-hot', reason: '暂无匹配内容，为你推荐热门文章' };
    }

    // AI 精排
    const profile = `偏好分类：${pref.categories.map((c) => c.name).join('、') || '暂无'}；偏好标签：${
      pref.tags.map((t) => t.name).join('、') || '暂无'
    }`;
    try {
      const candidateBrief = JSON.stringify(
        candidates.slice(0, 20).map((b) => ({
          id: b.id,
          title: b.title,
          category: b.categoryName,
          summary: truncateText(b.summary || '', 60),
        }))
      );
      const prompt = ai.prompts.recommend({ profile, candidates: candidateBrief });
      const result = await ai.invoke('recommend', prompt, { userId, json: true, temperature: 0.4 });
      const parsed = ai.parseJson(result.content, {});
      const ids = Array.isArray(parsed.ids) ? parsed.ids.map(Number).filter(Boolean) : [];

      if (ids.length) {
        const ordered = await blogDao.findByIds(ids.slice(0, limit));
        if (ordered.length) {
          return { list: ordered, strategy: 'ai-rank', reason: parsed.reason || '根据你的阅读偏好推荐' };
        }
      }
    } catch (err) {
      logger.warn(`AI 推荐排序失败，回退规则召回: ${err.message}`);
    }

    return {
      list: candidates.slice(0, limit),
      strategy: 'rule-recall',
      reason: `根据你常看的「${pref.categories[0]?.name || pref.tags[0]?.name || '内容'}」推荐`,
    };
  },

  /** 一键为博客生成摘要 + 关键词（发布时自动调用） */
  async autoEnrich({ content, userId }) {
    const plain = markdownToText(content);
    const [summaryRes, keywordRes] = await Promise.allSettled([
      this.summarize({ content: plain, length: 'medium', userId }),
      this.extractKeywords({ content: plain, count: 6, userId }),
    ]);
    return {
      summary: summaryRes.status === 'fulfilled' ? summaryRes.value.summary : '',
      keywords: keywordRes.status === 'fulfilled' ? keywordRes.value.keywords : [],
    };
  },
};

module.exports = aiService;
