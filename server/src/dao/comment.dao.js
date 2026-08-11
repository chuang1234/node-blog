/**
 * 评论数据访问层
 */
const db = require('../config/db');

const FIELDS = `c.id, c.blog_id AS blogId, c.user_id AS userId, c.parent_id AS parentId,
  c.root_id AS rootId, c.content, c.sentiment, c.sentiment_score AS sentimentScore,
  c.status, c.is_ai_reply AS isAiReply, c.like_count AS likeCount, c.report_count AS reportCount,
  c.created_at AS createdAt,
  u.nickname AS userName, u.avatar AS userAvatar, u.username AS userAccount, u.role AS userRole`;

module.exports = {
  /** 查询某篇博客的根评论（分页） */
  async findRootPage(blogId, { offset = 0, pageSize = 10, sentiment, orderBy = 'latest' } = {}) {
    const where = ['c.blog_id = ?', "c.status = 'normal'", 'c.root_id IS NULL'];
    const params = [blogId];
    if (sentiment) {
      where.push('c.sentiment = ?');
      params.push(sentiment);
    }
    const whereSql = where.join(' AND ');
    const order = orderBy === 'hot' ? 'c.like_count DESC, c.created_at DESC' : 'c.created_at DESC';

    const list = await db.query(
      `SELECT ${FIELDS} FROM comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE ${whereSql} ORDER BY ${order} LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(
      `SELECT COUNT(*) AS total FROM comments c WHERE ${whereSql}`,
      params
    );
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 批量查询子回复（楼中楼） */
  async findRepliesByRootIds(rootIds = []) {
    if (!rootIds.length) return [];
    const placeholders = rootIds.map(() => '?').join(',');
    return db.query(
      `SELECT ${FIELDS}, pu.nickname AS replyToName
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN comments pc ON pc.id = c.parent_id
       LEFT JOIN users pu ON pu.id = pc.user_id
       WHERE c.root_id IN (${placeholders}) AND c.status = 'normal'
       ORDER BY c.created_at ASC`,
      rootIds
    );
  },

  findById(id) {
    return db.queryOne(
      `SELECT ${FIELDS} FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [id]
    );
  },

  async create(data) {
    const result = await db.execute(
      `INSERT INTO comments
        (blog_id, user_id, parent_id, root_id, content, sentiment, sentiment_score, status, is_ai_reply, ip_region)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.blogId,
        data.userId,
        data.parentId || null,
        data.rootId || null,
        data.content,
        data.sentiment || 'unknown',
        data.sentimentScore || 0,
        data.status || 'normal',
        data.isAiReply ? 1 : 0,
        data.ipRegion || '',
      ]
    );
    return result.insertId;
  },

  async updateSentiment(id, sentiment, score) {
    return db.execute('UPDATE comments SET sentiment = ?, sentiment_score = ? WHERE id = ?', [
      sentiment,
      score,
      id,
    ]);
  },

  async updateStatus(id, status) {
    const result = await db.execute('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM comments WHERE id = ?', [id]);
    return result.affectedRows;
  },

  incrLike(id, delta = 1) {
    return db.execute(
      'UPDATE comments SET like_count = GREATEST(0, like_count + ?) WHERE id = ?',
      [delta, id]
    );
  },

  incrReport(id) {
    return db.execute('UPDATE comments SET report_count = report_count + 1 WHERE id = ?', [id]);
  },

  /** 管理端分页 */
  async findPage({ keyword, sentiment, status, blogId, offset, pageSize }) {
    const where = ['1=1'];
    const params = [];
    if (keyword) {
      where.push('c.content LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (sentiment) {
      where.push('c.sentiment = ?');
      params.push(sentiment);
    }
    if (status) {
      where.push('c.status = ?');
      params.push(status);
    }
    if (blogId) {
      where.push('c.blog_id = ?');
      params.push(blogId);
    }
    const whereSql = where.join(' AND ');

    const list = await db.query(
      `SELECT ${FIELDS}, b.title AS blogTitle
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN blogs b ON b.id = c.blog_id
       WHERE ${whereSql} ORDER BY c.created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(`SELECT COUNT(*) AS total FROM comments c WHERE ${whereSql}`, params);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 统计某篇博客的正常评论数 */
  async countByBlog(blogId) {
    const row = await db.queryOne(
      "SELECT COUNT(*) AS total FROM comments WHERE blog_id = ? AND status = 'normal'",
      [blogId]
    );
    return row ? row.total : 0;
  },

  async countAll() {
    const row = await db.queryOne("SELECT COUNT(*) AS total FROM comments WHERE status = 'normal'");
    return row ? row.total : 0;
  },

  async countByDate(date) {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM comments WHERE DATE(created_at) = ?', [date]);
    return row ? row.total : 0;
  },

  /** 情感分布统计 */
  countGroupBySentiment() {
    return db.query(
      `SELECT sentiment AS name, COUNT(*) AS value FROM comments
       WHERE status = 'normal' GROUP BY sentiment`
    );
  },
};
