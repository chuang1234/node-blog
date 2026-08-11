/**
 * 路由总入口
 * 所有业务路由统一挂载在 /api 前缀下
 */
const express = require('express');
const userRoute = require('./user.route');
const blogRoute = require('./blog.route');
const commentRoute = require('./comment.route');
const interactionRoute = require('./interaction.route');
const aiRoute = require('./ai.route');
const categoryRoute = require('./category.route');
const adminRoute = require('./admin.route');
const { success } = require('../utils/response');
const cache = require('../config/redis');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [系统]
 *     summary: 健康检查
 */
router.get('/health', (req, res) =>
  success(res, {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    cacheMode: cache.isMemoryMode() ? 'memory' : 'redis',
    timestamp: new Date().toISOString(),
  })
);

router.use('/users', userRoute);
router.use('/blogs', blogRoute);
router.use('/comments', commentRoute);
router.use('/interactions', interactionRoute);
router.use('/ai', aiRoute);
router.use('/admin', adminRoute);
// 分类与标签走扁平路径：/api/categories、/api/tags
router.use('/', categoryRoute);

module.exports = router;
