/**
 * 博客路由
 * @swagger tags: [博客]
 */
const express = require('express');
const controller = require('../controllers/blog.controller');
const { validate } = require('../middlewares/validate');
const { auth, optionalAuth } = require('../middlewares/auth');
const { blog: schema, common } = require('../validators');
const { createUploader } = require('../middlewares/upload');

const router = express.Router();
const coverUploader = createUploader('cover');

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     tags: [博客]
 *     summary: 博客列表（支持分页、分类、标签、关键词搜索）
 */
router.get('/', optionalAuth(), validate({ query: schema.listQuery }), controller.list);

/**
 * @swagger
 * /api/blogs/hot:
 *   get:
 *     tags: [博客]
 *     summary: 热门文章
 */
router.get('/hot', controller.hot);

/**
 * @swagger
 * /api/blogs/mine:
 *   get:
 *     tags: [博客]
 *     summary: 我的文章列表（含草稿）
 *     security: [{ bearerAuth: [] }]
 */
router.get('/mine', auth(), validate({ query: schema.listQuery }), controller.myList);

/** 上传封面图 */
router.post('/cover', auth(), coverUploader.single('file'), controller.uploadCover);

/**
 * @swagger
 * /api/blogs:
 *   post:
 *     tags: [博客]
 *     summary: 创建文章（草稿或直接发布，发布前会经过 AI 内容审核）
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', auth(), validate({ body: schema.create }), controller.create);

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     tags: [博客]
 *     summary: 文章详情
 */
router.get('/:id', optionalAuth(), validate({ params: common.idParam }), controller.detail);

router.get('/:id/related', validate({ params: common.idParam }), controller.related);

router.put(
  '/:id',
  auth(),
  validate({ params: common.idParam, body: schema.update }),
  controller.update
);

router.patch(
  '/:id/status',
  auth(),
  validate({ params: common.idParam, body: schema.changeStatus }),
  controller.changeStatus
);

router.delete('/:id', auth(), validate({ params: common.idParam }), controller.remove);

module.exports = router;
