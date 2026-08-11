/**
 * 后台管理路由
 * 整个路由组统一要求管理员权限
 * @swagger tags: [后台管理]
 */
const express = require('express');
const Joi = require('joi');
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const blogController = require('../controllers/blog.controller');
const commentController = require('../controllers/comment.controller');
const categoryController = require('../controllers/category.controller');
const { validate } = require('../middlewares/validate');
const { auth, requireAdmin } = require('../middlewares/auth');
const { user, blog, comment, category, admin, common } = require('../validators');

const router = express.Router();

// 全局管理员校验
router.use(auth(), requireAdmin());

// ---------------- 数据看板 ----------------
/**
 * @swagger
 * /api/admin/stats/overview:
 *   get:
 *     tags: [后台管理]
 *     summary: 系统数据概览（用户数、创作量、互动量、AI 用量）
 *     security: [{ bearerAuth: [] }]
 */
router.get('/stats/overview', adminController.overview);
router.get('/stats/trend', validate({ query: admin.trendQuery }), adminController.trend);
router.get('/stats/distribution', adminController.distribution);
router.post('/stats/snapshot', adminController.generateSnapshot);

// ---------------- 用户管理 ----------------
router.get('/users', validate({ query: user.adminListQuery }), userController.adminList);
router.patch(
  '/users/:id',
  validate({ params: common.idParam, body: user.adminUpdate }),
  userController.adminUpdate
);
router.delete('/users/:id', validate({ params: common.idParam }), userController.adminRemove);

// ---------------- 博客管理 ----------------
router.get('/blogs', validate({ query: blog.listQuery }), blogController.adminList);
router.patch(
  '/blogs/:id/top',
  validate({ params: common.idParam, body: Joi.object({ isTop: Joi.boolean().required() }) }),
  blogController.adminSetTop
);
router.patch(
  '/blogs/:id/status',
  validate({ params: common.idParam, body: blog.changeStatus }),
  blogController.changeStatus
);
router.delete('/blogs/:id', validate({ params: common.idParam }), blogController.remove);

// ---------------- 评论管理 ----------------
router.get('/comments', validate({ query: comment.adminListQuery }), commentController.adminList);
router.patch(
  '/comments/:id/status',
  validate({
    params: common.idParam,
    body: Joi.object({ status: Joi.string().valid('normal', 'hidden', 'pending').required() }),
  }),
  commentController.adminUpdateStatus
);
router.delete('/comments/:id', validate({ params: common.idParam }), commentController.remove);

// ---------------- 举报管理 ----------------
router.get('/reports', validate({ query: common.pageQuery }), commentController.adminReportList);
router.patch(
  '/reports/:id',
  validate({
    params: common.idParam,
    body: Joi.object({ status: Joi.string().valid('resolved', 'ignored').default('resolved') }),
  }),
  commentController.adminHandleReport
);

// ---------------- 分类 / 标签管理 ----------------
router.post('/categories', validate({ body: category.create }), categoryController.createCategory);
router.put(
  '/categories/:id',
  validate({ params: common.idParam, body: category.update }),
  categoryController.updateCategory
);
router.delete('/categories/:id', validate({ params: common.idParam }), categoryController.removeCategory);

router.get('/tags', validate({ query: common.pageQuery }), categoryController.adminTagPage);
router.post('/tags', validate({ body: category.createTag }), categoryController.createTag);
router.delete('/tags/:id', validate({ params: common.idParam }), categoryController.removeTag);

// ---------------- AI 参数配置 ----------------
/**
 * @swagger
 * /api/admin/ai/configs:
 *   get:
 *     tags: [后台管理]
 *     summary: 获取 AI Agent 全部可配置参数
 *     security: [{ bearerAuth: [] }]
 */
router.get('/ai/configs', adminController.aiConfigList);
router.put('/ai/configs', validate({ body: admin.aiConfigSave }), adminController.aiConfigSave);

// ---------------- AI 调用日志 ----------------
router.get('/ai/logs', validate({ query: admin.aiLogQuery }), adminController.aiLogList);
router.get('/ai/logs/summary', adminController.aiLogSummary);

// ---------------- 敏感词管理 ----------------
router.get('/words', validate({ query: admin.sensitiveWordQuery }), adminController.wordList);
router.post('/words', validate({ body: admin.sensitiveWordCreate }), adminController.wordCreate);
router.patch(
  '/words/:id',
  validate({ params: common.idParam, body: admin.sensitiveWordUpdate }),
  adminController.wordUpdate
);
router.delete('/words/:id', validate({ params: common.idParam }), adminController.wordRemove);

module.exports = router;
