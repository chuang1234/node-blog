/**
 * 互动数据访问层：点赞 / 收藏 / 浏览记录 / 举报
 */
const db = require('../config/db');

module.exports = {
  // ---------------- 点赞 ----------------
  async findLike(userId, targetType, targetId) {
    return db.queryOne(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );
  },

  async addLike(userId, targetType, targetId) {
    const result = await db.execute(
      'INSERT IGNORE INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
      [userId, targetType, targetId]
    );
    return result.affectedRows > 0;
  },

  async removeLike(userId, targetType, targetId) {
    const result = await db.execute(
      'DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );
    return result.affectedRows > 0;
  },

  /** 批量查询用户对一组目标的点赞状态 */
  async findLikedIds(userId, targetType, targetIds = []) {
    if (!userId || !targetIds.length) return [];
    const placeholders = targetIds.map(() => '?').join(',');
    const rows = await db.query(
      `SELECT target_id AS targetId FROM likes
       WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`,
      [userId, targetType, ...targetIds]
    );
    return rows.map((r) => Number(r.targetId));
  },

  // ---------------- 收藏 ----------------
  async findFavorite(userId, blogId) {
    return db.queryOne('SELECT id FROM favorites WHERE user_id = ? AND blog_id = ?', [userId, blogId]);
  },

  async addFavorite(userId, blogId) {
    const result = await db.execute(
      'INSERT IGNORE INTO favorites (user_id, blog_id) VALUES (?, ?)',
      [userId, blogId]
    );
    return result.affectedRows > 0;
  },

  async removeFavorite(userId, blogId) {
    const result = await db.execute('DELETE FROM favorites WHERE user_id = ? AND blog_id = ?', [
      userId,
      blogId,
    ]);
    return result.affectedRows > 0;
  },

  /** 我的收藏列表 */
  async findFavoritePage(userId, { offset = 0, pageSize = 10 }) {
    const list = await db.query(
      `SELECT b.id, b.title, b.summary, b.cover, b.status, b.word_count AS wordCount,
              b.view_count AS viewCount, b.like_count AS likeCount,
              b.comment_count AS commentCount, b.favorite_count AS favoriteCount,
              b.published_at AS publishedAt, b.created_at AS createdAt,
              u.nickname AS authorName, f.created_at AS favoritedAt
       FROM favorites f
       JOIN blogs b ON b.id = f.blog_id
       LEFT JOIN users u ON u.id = b.user_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      [userId]
    );
    const countRow = await db.queryOne('SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?', [userId]);
    return { list, total: countRow ? countRow.total : 0 };
  },

  // ---------------- 浏览记录 ----------------
  addViewLog({ userId, blogId, ip }) {
    return db.execute('INSERT INTO view_logs (user_id, blog_id, ip) VALUES (?, ?, ?)', [
      userId || null,
      blogId,
      ip || '',
    ]);
  },

  /** 用户近期浏览过的分类与标签偏好（用于个性化推荐） */
  async findUserPreference(userId, limit = 30) {
    const categories = await db.query(
      `SELECT c.id, c.name, COUNT(*) AS cnt
       FROM view_logs v
       JOIN blogs b ON b.id = v.blog_id
       JOIN categories c ON c.id = b.category_id
       WHERE v.user_id = ?
       GROUP BY c.id, c.name ORDER BY cnt DESC LIMIT 5`,
      [userId]
    );
    const tags = await db.query(
      `SELECT t.id, t.name, COUNT(*) AS cnt
       FROM view_logs v
       JOIN blog_tags bt ON bt.blog_id = v.blog_id
       JOIN tags t ON t.id = bt.tag_id
       WHERE v.user_id = ?
       GROUP BY t.id, t.name ORDER BY cnt DESC LIMIT 8`,
      [userId]
    );
    const viewedIds = await db.query(
      `SELECT DISTINCT blog_id AS blogId FROM view_logs
       WHERE user_id = ? ORDER BY blog_id DESC LIMIT ${Number(limit)}`,
      [userId]
    );
    return {
      categories,
      tags,
      viewedBlogIds: viewedIds.map((r) => Number(r.blogId)),
    };
  },

  async countPvByDate(date) {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM view_logs WHERE DATE(created_at) = ?', [date]);
    return row ? row.total : 0;
  },

  async countUvByDate(date) {
    const row = await db.queryOne(
      'SELECT COUNT(DISTINCT COALESCE(user_id, ip)) AS total FROM view_logs WHERE DATE(created_at) = ?',
      [date]
    );
    return row ? row.total : 0;
  },

  /** 近 N 天的访问趋势 */
  findViewTrend(days = 7) {
    return db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS pv,
              COUNT(DISTINCT COALESCE(user_id, ip)) AS uv
       FROM view_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [days]
    );
  },

  // ---------------- 举报 ----------------
  async addReport({ userId, targetType, targetId, reason }) {
    const result = await db.execute(
      'INSERT INTO reports (user_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
      [userId, targetType, targetId, reason || '']
    );
    return result.insertId;
  },

  async findReportPage({ status, offset = 0, pageSize = 10 }) {
    const where = status ? 'WHERE r.status = ?' : '';
    const params = status ? [status] : [];
    const list = await db.query(
      `SELECT r.id, r.user_id AS userId, r.target_type AS targetType, r.target_id AS targetId,
              r.reason, r.status, r.created_at AS createdAt, u.nickname AS reporterName
       FROM reports r LEFT JOIN users u ON u.id = r.user_id
       ${where} ORDER BY r.created_at DESC LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(`SELECT COUNT(*) AS total FROM reports r ${where}`, params);
    return { list, total: countRow ? countRow.total : 0 };
  },

  updateReportStatus(id, status) {
    return db.execute('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
  },
};
