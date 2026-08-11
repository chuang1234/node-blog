/**
 * AI Agent 路由
 * 统一挂载登录校验 + AI 专用限流，防止接口被滥用
 * @swagger tags: [AI]
 */
const express = require('express');
const controller = require('../controllers/ai.controller');
const { validate } = require('../middlewares/validate');
const { auth, optionalAuth } = require('../middlewares/auth');
const { aiRateLimit } = require('../middlewares/rateLimit');
const { ai: schema } = require('../validators');

const router = express.Router();

/**
 * @swagger
 * /api/ai/status:
 *   get:
 *     tags: [AI]
 *     summary: 查询 AI 能力状态（是否开启、当前模型、配额）
 */
router.get('/status', optionalAuth(), controller.status);

/**
 * @swagger
 * /api/ai/recommend:
 *   get:
 *     tags: [AI]
 *     summary: 个性化内容推荐（未登录返回热门）
 */
router.get('/recommend', optionalAuth(), validate({ query: schema.recommendQuery }), controller.recommend);

// 以下接口均需登录并受 AI 限流约束
router.use(auth(), aiRateLimit());

/**
 * @swagger
 * /api/ai/draft:
 *   post:
 *     tags: [AI]
 *     summary: AI 生成博客初稿（可指定风格与语言）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/draft', validate({ body: schema.draft }), controller.draft);

/**
 * @swagger
 * /api/ai/polish:
 *   post:
 *     tags: [AI]
 *     summary: AI 内容润色
 *     security: [{ bearerAuth: [] }]
 */
router.post('/polish', validate({ body: schema.content }), controller.polish);

/** AI 错别字与语病修正 */
router.post('/proofread', validate({ body: schema.content }), controller.proofread);

/** AI 段落重构 */
router.post('/restructure', validate({ body: schema.content }), controller.restructure);

/** AI 标题优化，返回多个候选 */
router.post('/title', validate({ body: schema.title }), controller.title);

/**
 * @swagger
 * /api/ai/summary:
 *   post:
 *     tags: [AI]
 *     summary: AI 智能摘要（长度可选 short/medium/long）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/summary', validate({ body: schema.summary }), controller.summary);

/** AI 关键词提取 */
router.post('/keywords', validate({ body: schema.keywords }), controller.keywords);

/**
 * @swagger
 * /api/ai/reply:
 *   post:
 *     tags: [AI]
 *     summary: AI 生成评论回复（可配置语气）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/reply', validate({ body: schema.reply }), controller.reply);

/** AI 评论情感分析 */
router.post('/sentiment', validate({ body: schema.sentiment }), controller.sentiment);

/**
 * @swagger
 * /api/ai/moderate:
 *   post:
 *     tags: [AI]
 *     summary: AI 内容审核（敏感词 + 语义双重检测）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/moderate', validate({ body: schema.moderate }), controller.moderate);

/** AI 创作话题推荐 */
router.get('/topics', validate({ query: schema.topicsQuery }), controller.topics);

module.exports = router;
