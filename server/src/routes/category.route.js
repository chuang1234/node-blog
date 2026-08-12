/**
 * 分类与标签路由（公开读取）
 * @swagger tags: [分类标签]
 */
const express = require('express');
const controller = require('../controllers/category.controller');

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [分类标签]
 *     summary: 获取全部分类
 */
router.get('/categories', controller.listCategories);

/** 公开：按 slug 获取单个分类 */
router.get('/categories/:slug', controller.categoryBySlug);

/**
 * @swagger
 * /api/tags:
 *   get:
 *     tags: [分类标签]
 *     summary: 获取全部标签
 */
router.get('/tags', controller.listTags);

/** 热门标签 */
router.get('/tags/hot', controller.hotTags);

/** 公开：按名称获取单个标签 */
router.get('/tags/:name', controller.tagByName);

module.exports = router;
