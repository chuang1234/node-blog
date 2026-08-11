/**
 * 评论与互动路由
 * @swagger tags: [互动]
 */
const express = require('express');
const Joi = require('joi');
const controller = require('../controllers/comment.controller');
const { validate } = require('../middlewares/validate');
const { auth, optionalAuth } = require('../middlewares/auth');
const { comment: schema, common } = require('../validators');

const router = express.Router();

/**
 * @swagger
 * /api/comments/blog/{blogId}:
 *   get:
 *     tags: [互动]
 *     summary: 获取某篇文章的评论列表（含 AI 情感标记与楼中楼回复）
 */
router.get(
  '/blog/:blogId',
  optionalAuth(),
  validate({
    params: Joi.object({ blogId: Joi.number().integer().positive().required() }),
    query: schema.listQuery,
  }),
  controller.list
);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     tags: [互动]
 *     summary: 发表评论（自动进行内容审核与情感分析）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', auth(), validate({ body: schema.create }), controller.create);

router.delete('/:id', auth(), validate({ params: common.idParam }), controller.remove);

router.post(
  '/:id/report',
  auth(),
  validate({ params: common.idParam, body: schema.report }),
  controller.report
);

module.exports = router;
