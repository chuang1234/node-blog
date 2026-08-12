/**
 * 站内通知路由（需登录）
 */
const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth');

const router = express.Router();

router.use(auth());

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.remove);

module.exports = router;
