/**
 * 点赞 / 收藏路由
 * @swagger tags: [互动]
 */
const express = require('express');
const Joi = require('joi');
const controller = require('../controllers/comment.controller');
const { validate } = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const { common } = require('../validators');

const router = express.Router();

/**
 * @swagger
 * /api/interactions/like/{targetType}/{targetId}:
 *   post:
 *     tags: [互动]
 *     summary: 点赞/取消点赞（幂等切换）
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/like/:targetType/:targetId',
  auth(),
  validate({
    params: Joi.object({
      targetType: Joi.string().valid('blog', 'comment').required(),
      targetId: Joi.number().integer().positive().required(),
    }),
  }),
  controller.toggleLike
);

/**
 * @swagger
 * /api/interactions/favorite/{blogId}:
 *   post:
 *     tags: [互动]
 *     summary: 收藏/取消收藏
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/favorite/:blogId',
  auth(),
  validate({ params: Joi.object({ blogId: Joi.number().integer().positive().required() }) }),
  controller.toggleFavorite
);

/** 我的收藏列表 */
router.get('/favorites', auth(), validate({ query: common.pageQuery }), controller.myFavorites);

module.exports = router;
