/**
 * AI Agent 控制器
 * 所有接口均已在路由层挂载登录校验与 AI 限流
 */
const aiService = require('../services/ai.service');
const aiConfigService = require('../services/aiConfig.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');

module.exports = {
  /** AI 能力开关与当前配置（前端据此显示/隐藏 AI 入口） */
  status: asyncHandler(async (req, res) => {
    const [enabled, provider, model, style, perMin, perDay] = await Promise.all([
      aiConfigService.getBoolean('ai.enabled', true),
      aiConfigService.getString('ai.provider', 'mock'),
      aiConfigService.getString('ai.model', ''),
      aiConfigService.getString('ai.default_style', 'formal'),
      aiConfigService.getNumber('ai.rate_limit_per_min', 10),
      aiConfigService.getNumber('ai.rate_limit_per_day', 200),
    ]);
    return success(res, {
      enabled,
      provider,
      model,
      defaultStyle: style,
      offlineMode: provider === 'mock',
      rateLimit: { perMin, perDay },
    });
  }),

  /** 生成博客初稿 */
  draft: asyncHandler(async (req, res) => {
    const result = await aiService.generateDraft({ ...req.body, userId: req.user.id });
    return success(res, result, '初稿生成完成');
  }),

  /** 内容润色 */
  polish: asyncHandler(async (req, res) => {
    const result = await aiService.polish({ ...req.body, userId: req.user.id });
    return success(res, result, '润色完成');
  }),

  /** 错别字修正 */
  proofread: asyncHandler(async (req, res) => {
    const result = await aiService.proofread({ ...req.body, userId: req.user.id });
    return success(res, result, '校对完成');
  }),

  /** 段落重构 */
  restructure: asyncHandler(async (req, res) => {
    const result = await aiService.restructure({ ...req.body, userId: req.user.id });
    return success(res, result, '重构完成');
  }),

  /** 标题优化 */
  title: asyncHandler(async (req, res) => {
    const result = await aiService.optimizeTitle({ ...req.body, userId: req.user.id });
    return success(res, result, '已生成候选标题');
  }),

  /** 智能摘要 */
  summary: asyncHandler(async (req, res) => {
    const result = await aiService.summarize({ ...req.body, userId: req.user.id });
    return success(res, result, '摘要生成完成');
  }),

  /** 关键词提取 */
  keywords: asyncHandler(async (req, res) => {
    const result = await aiService.extractKeywords({ ...req.body, userId: req.user.id });
    return success(res, result, '关键词提取完成');
  }),

  /** 评论智能回复（根据传入文本生成） */
  reply: asyncHandler(async (req, res) => {
    const result = await aiService.replyComment({
      ...req.body,
      authorName: req.user.nickname,
      userId: req.user.id,
    });
    return success(res, result, '回复已生成');
  }),

  /** 情感分析 */
  sentiment: asyncHandler(async (req, res) => {
    const result = await aiService.analyzeSentiment({ text: req.body.text, userId: req.user.id });
    return success(res, result);
  }),

  /** 内容审核 */
  moderate: asyncHandler(async (req, res) => {
    const result = await aiService.moderate({ content: req.body.content, userId: req.user.id });
    return success(res, result, result.pass ? '内容审核通过' : '内容存在风险');
  }),

  /** 创作话题推荐 */
  topics: asyncHandler(async (req, res) => {
    const result = await aiService.suggestTopics({
      userId: req.user.id,
      count: req.query.count,
    });
    return success(res, result);
  }),

  /** 个性化内容推荐（游客也可访问，返回热门） */
  recommend: asyncHandler(async (req, res) => {
    const result = await aiService.recommendBlogs({
      userId: req.user ? req.user.id : null,
      limit: req.query.limit,
    });
    return success(res, result);
  }),
};
