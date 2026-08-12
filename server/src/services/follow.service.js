/**
 * 关注关系业务服务
 */
const followDao = require('../dao/follow.dao');
const userDao = require('../dao/user.dao');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

module.exports = {
  /** 关注某人 */
  async follow(followerId, followingId) {
    if (String(followerId) === String(followingId)) {
      const err = new Error('不能关注自己');
      err.status = 400;
      throw err;
    }
    const target = await userDao.findById(followingId);
    if (!target || target.status !== 1) {
      const err = new Error('用户不存在或已被禁用');
      err.status = 404;
      throw err;
    }
    await followDao.follow(followerId, followingId);
    // 被关注者收到站内通知（fire-and-forget，失败不影响主流程）
    try {
      await notificationService.notifyFollow(followerId, followingId);
    } catch (e) {
      logger.warn(`关注通知写入失败(已忽略): ${e.message}`);
    }
    return true;
  },

  /** 取消关注 */
  async unfollow(followerId, followingId) {
    await followDao.unfollow(followerId, followingId);
    return true;
  },

  /** 是否已关注 */
  isFollowing(followerId, followingId) {
    return followDao.isFollowing(followerId, followingId);
  },

  /** 关注统计 */
  getCounts(userId) {
    return followDao.getCounts(userId);
  },

  /** 粉丝列表 */
  listFollowers(userId, pageOpt) {
    return followDao.listFollowers(userId, pageOpt);
  },

  /** 关注列表 */
  listFollowing(userId, pageOpt) {
    return followDao.listFollowing(userId, pageOpt);
  },
};
