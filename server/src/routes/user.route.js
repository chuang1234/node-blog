/**
 * 用户路由
 * @swagger tags: [用户]
 */
const express = require('express');
const controller = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const { user: schema, common } = require('../validators');
const { createUploader } = require('../middlewares/upload');

const router = express.Router();
const avatarUploader = createUploader('avatar');

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [用户]
 *     summary: 用户注册
 */
router.post('/register', validate({ body: schema.register }), controller.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [用户]
 *     summary: 用户登录，返回 JWT
 */
router.post('/login', validate({ body: schema.login }), controller.login);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [用户]
 *     summary: 获取当前登录用户信息
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', auth(), controller.me);

router.put('/me', auth(), validate({ body: schema.updateProfile }), controller.updateProfile);

router.put('/me/password', auth(), validate({ body: schema.changePassword }), controller.changePassword);

router.post('/me/avatar', auth(), avatarUploader.single('file'), controller.uploadAvatar);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [用户]
 *     summary: 查看用户公开主页
 */
router.get('/:id', validate({ params: common.idParam }), controller.publicProfile);

module.exports = router;
