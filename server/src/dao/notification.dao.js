/**
 * 站内通知数据访问层
 */
const db = require('../config/db');

module.exports = {
  /** 分页列表（关联触发者昵称/头像、文章标题） */
  async list(userId, { offset = 0, pageSize = 20 }) {
    const list = await db.query(
      `SELECT n.id, n.user_id AS userId, n.type, n.actor_id AS actorId,
              n.blog_id AS blogId, n.comment_id AS commentId,
              n.target_type AS targetType, n.target_id AS targetId,
              n.is_read AS isRead, n.created_at AS createdAt,
              a.nickname AS actorName, a.avatar AS actorAvatar,
              b.title AS blogTitle, b.status AS blogStatus
       FROM notifications n
       LEFT JOIN users a ON a.id = n.actor_id
       LEFT JOIN blogs b ON b.id = n.blog_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      [userId]
    );
    const countRow = await db.queryOne('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?', [userId]);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 未读数量 */
  async unreadCount(userId) {
    const row = await db.queryOne(
      'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return row ? row.cnt : 0;
  },

  /** 插入一条通知 */
  async create({ userId, type, actorId, blogId, commentId, targetType, targetId }) {
    const result = await db.execute(
      `INSERT INTO notifications (user_id, type, actor_id, blog_id, comment_id, target_type, target_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, actorId, blogId || null, commentId || null, targetType || null, targetId || null]
    );
    return result.insertId;
  },

  /** 标记单条已读 */
  async markRead(userId, id) {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  },

  /** 全部标记已读 */
  async markAllRead(userId) {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },

  /** 删除单条 */
  async remove(userId, id) {
    await db.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
  },
};
