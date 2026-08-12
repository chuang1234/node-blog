/**
 * SEO 路由（站点根路径，不挂载在 /api 下）
 * @swagger tags: [SEO]
 */
const express = require('express');
const controller = require('../controllers/seo.controller');

const router = express.Router();

/**
 * @swagger
 * /sitemap.xml:
 *   get:
 *     tags: [SEO]
 *     summary: 站点地图（XML）
 */
router.get('/sitemap.xml', controller.sitemap);

/**
 * @swagger
 * /rss.xml:
 *   get:
 *     tags: [SEO]
 *     summary: RSS 2.0 订阅源
 */
router.get('/rss.xml', controller.rss);

/**
 * @swagger
 * /robots.txt:
 *   get:
 *     tags: [SEO]
 *     summary: 爬虫协议
 */
router.get('/robots.txt', controller.robots);

module.exports = router;
