/**
 * 站内通知业务服务
 *
 * notify() 为统一入口，由互动相关业务（评论/点赞/收藏）在成功后调用。
 * 设计原则：
 *  - 不通知自己（actor 与接收者相同则跳过）
 *  - 写入失败不影响主业务流程，仅记录告警日志
 *  - 采用 fire-and-forget，调用方无需 await
 */
const notificationDao = require('../dao/notification.dao');
const logger = require('../utils/logger');

/**
 * 发送一条通知
 * @param {object} payload
 * @param {number} payload.userId    接收者 ID
 * @param {string} payload.type      类型 comment | reply | like_blog | like_comment | favorite
 * @param {number} payload.actorId   触发者 ID
 * @param {number} [payload.blogId]  关联文章 ID
 * @param {number} [payload.commentId] 关联评论 ID
 * @param {string} [payload.targetType] blog | comment
 * @param {number} [payload.targetId]  目标 ID
 */
async function notify({ userId, type, actorId, blogId, commentId, targetType, targetId }) {
  if (!userId || !actorId) return;
  if (String(userId) === String(actorId)) return; // 不通知自己
  try {
    await notificationDao.create({ userId, type, actorId, blogId, commentId, targetType, targetId });
  } catch (err) {
    logger.warn(`通知写入失败(已忽略): ${err.message}`);
  }
}

module.exports = {
  notify,

  /** 关注通知：被关注者收到提醒（不通知自己） */
  async notifyFollow(followerId, followingId) {
    if (!followerId || !followingId) return;
    if (String(followerId) === String(followingId)) return;
    try {
      await notificationDao.create({ userId: followingId, type: 'follow', actorId: followerId });
    } catch (err) {
      logger.warn(`关注通知写入失败(已忽略): ${err.message}`);
    }
  },

  /** 通知列表（分页） */
  async list(userId, pageOpt) {
    return notificationDao.list(userId, pageOpt);
  },

  /** 未读数量 */
  async unreadCount(userId) {
    return notificationDao.unreadCount(userId);
  },

  /** 标记单条已读 */
  async markRead(userId, id) {
    await notificationDao.markRead(userId, id);
    return true;
  },

  /** 全部标记已读 */
  async markAllRead(userId) {
    await notificationDao.markAllRead(userId);
    return true;
  },

  /** 删除单条 */
  async remove(userId, id) {
    await notificationDao.remove(userId, id);
    return true;
  },
};
