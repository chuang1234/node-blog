/**
 * 博客数据访问层
 */
const db = require('../config/db');

/** 列表场景不返回 content 大字段，减少传输开销 */
const LIST_FIELDS = `b.id, b.user_id AS userId, b.category_id AS categoryId, b.title, b.summary,
  b.cover, b.keywords, b.status, b.audit_status AS auditStatus, b.is_ai_assisted AS isAiAssisted,
  b.is_top AS isTop, b.view_count AS viewCount, b.like_count AS likeCount,
  b.comment_count AS commentCount, b.favorite_count AS favoriteCount, b.word_count AS wordCount,
  b.published_at AS publishedAt, b.created_at AS createdAt, b.updated_at AS updatedAt,
  u.nickname AS authorName, u.avatar AS authorAvatar, u.username AS authorUsername,
  c.name AS categoryName, c.slug AS categorySlug`;

const JOIN_SQL = `FROM blogs b
  LEFT JOIN users u ON u.id = b.user_id
  LEFT JOIN categories c ON c.id = b.category_id`;

/** 构造列表查询的 WHERE 条件 */
function buildWhere(filter = {}) {
  const where = ['1=1'];
  const params = [];

  if (filter.status) {
    where.push('b.status = ?');
    params.push(filter.status);
  }
  if (filter.userId) {
    where.push('b.user_id = ?');
    params.push(filter.userId);
  }
  if (filter.categoryId) {
    where.push('b.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.auditStatus) {
    where.push('b.audit_status = ?');
    params.push(filter.auditStatus);
  }
  if (filter.keyword) {
    // 模糊搜索标题、摘要与关键词
    where.push('(b.title LIKE ? OR b.summary LIKE ? OR b.keywords LIKE ?)');
    const kw = `%${filter.keyword}%`;
    params.push(kw, kw, kw);
  }
  if (filter.tagId) {
    where.push('EXISTS (SELECT 1 FROM blog_tags bt WHERE bt.blog_id = b.id AND bt.tag_id = ?)');
    params.push(filter.tagId);
  }
  if (filter.excludeId) {
    where.push('b.id <> ?');
    params.push(filter.excludeId);
  }
  return { whereSql: where.join(' AND '), params };
}

/** 排序白名单，防止 SQL 注入 */
const ORDER_MAP = {
  latest: 'b.is_top DESC, COALESCE(b.published_at, b.created_at) DESC',
  hot: 'b.is_top DESC, b.view_count DESC, b.like_count DESC',
  comment: 'b.comment_count DESC, b.created_at DESC',
  updated: 'b.updated_at DESC',
};

module.exports = {
  /** 分页查询博客列表 */
  async findPage(filter = {}, { offset = 0, pageSize = 10, orderBy = 'latest' } = {}) {
    const { whereSql, params } = buildWhere(filter);
    const order = ORDER_MAP[orderBy] || ORDER_MAP.latest;

    const list = await db.query(
      `SELECT ${LIST_FIELDS} ${JOIN_SQL} WHERE ${whereSql}
       ORDER BY ${order} LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(`SELECT COUNT(*) AS total ${JOIN_SQL} WHERE ${whereSql}`, params);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 查询详情（含正文） */
  findById(id) {
    return db.queryOne(
      `SELECT ${LIST_FIELDS}, b.content, b.audit_remark AS auditRemark ${JOIN_SQL} WHERE b.id = ?`,
      [id]
    );
  },

  /** 仅查询归属信息（权限校验用，避免拉取大字段） */
  findOwner(id) {
    return db.queryOne('SELECT id, user_id AS userId, status, title FROM blogs WHERE id = ?', [id]);
  },

  /** 创建博客 */
  async create(data) {
    const result = await db.execute(
      `INSERT INTO blogs
        (user_id, category_id, title, summary, content, cover, keywords, status,
         audit_status, audit_remark, is_ai_assisted, word_count, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.categoryId || null,
        data.title,
        data.summary || '',
        data.content,
        data.cover || '',
        data.keywords || '',
        data.status || 'draft',
        data.auditStatus || 'pending',
        data.auditRemark || '',
        data.isAiAssisted ? 1 : 0,
        data.wordCount || 0,
        data.status === 'published' ? new Date() : null,
      ]
    );
    return result.insertId;
  },

  /** 更新博客（白名单字段） */
  async update(id, data) {
    const map = {
      categoryId: 'category_id',
      title: 'title',
      summary: 'summary',
      content: 'content',
      cover: 'cover',
      keywords: 'keywords',
      status: 'status',
      auditStatus: 'audit_status',
      auditRemark: 'audit_remark',
      isAiAssisted: 'is_ai_assisted',
      isTop: 'is_top',
      wordCount: 'word_count',
      publishedAt: 'published_at',
    };
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(typeof data[key] === 'boolean' ? Number(data[key]) : data[key]);
      }
    }
    if (!sets.length) return 0;
    params.push(id);
    const result = await db.execute(`UPDATE blogs SET ${sets.join(', ')} WHERE id = ?`, params);
    return result.affectedRows;
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM blogs WHERE id = ?', [id]);
    return result.affectedRows;
  },

  /** 浏览量自增 */
  incrView(id) {
    return db.execute('UPDATE blogs SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  /** 计数字段增减（点赞/评论/收藏） */
  incrCounter(id, field, delta = 1) {
    const allow = { like: 'like_count', comment: 'comment_count', favorite: 'favorite_count' };
    const col = allow[field];
    if (!col) throw new Error(`非法的计数字段: ${field}`);
    return db.execute(`UPDATE blogs SET ${col} = GREATEST(0, ${col} + ?) WHERE id = ?`, [delta, id]);
  },

  /** 直接设置某个计数字段为准确值（用于删除后重算） */
  setCounter(id, field, value) {
    const allow = { like: 'like_count', comment: 'comment_count', favorite: 'favorite_count' };
    const col = allow[field];
    if (!col) throw new Error(`非法的计数字段: ${field}`);
    return db.execute(`UPDATE blogs SET ${col} = ? WHERE id = ?`, [Number(value) || 0, id]);
  },

  /** 标签关联：全量替换 */
  async replaceTags(blogId, tagIds = []) {
    await db.execute('DELETE FROM blog_tags WHERE blog_id = ?', [blogId]);
    if (!tagIds.length) return;
    const values = tagIds.map(() => '(?, ?)').join(', ');
    const params = [];
    tagIds.forEach((tid) => params.push(blogId, tid));
    await db.execute(`INSERT IGNORE INTO blog_tags (blog_id, tag_id) VALUES ${values}`, params);
  },

  /** 批量查询多篇博客的标签 */
  async findTagsByBlogIds(blogIds = []) {
    if (!blogIds.length) return [];
    const placeholders = blogIds.map(() => '?').join(',');
    return db.query(
      `SELECT bt.blog_id AS blogId, t.id, t.name, t.color
       FROM blog_tags bt JOIN tags t ON t.id = bt.tag_id
       WHERE bt.blog_id IN (${placeholders})`,
      blogIds
    );
  },

  /** 相关文章推荐：同分类或同标签，按热度取 */
  findRelated(blogId, categoryId, limit = 6) {
    return db.query(
      `SELECT ${LIST_FIELDS} ${JOIN_SQL}
       WHERE b.status = 'published' AND b.id <> ?
         AND (b.category_id = ? OR EXISTS (
              SELECT 1 FROM blog_tags bt1
              JOIN blog_tags bt2 ON bt1.tag_id = bt2.tag_id
              WHERE bt1.blog_id = b.id AND bt2.blog_id = ?))
       ORDER BY b.view_count DESC LIMIT ${Number(limit)}`,
      [blogId, categoryId || 0, blogId]
    );
  },

  /** 按 ID 列表批量查询（保持传入顺序，用于推荐结果） */
  async findByIds(ids = []) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.query(
      `SELECT ${LIST_FIELDS} ${JOIN_SQL} WHERE b.id IN (${placeholders}) AND b.status = 'published'`,
      ids
    );
    const map = new Map(rows.map((r) => [String(r.id), r]));
    return ids.map((id) => map.get(String(id))).filter(Boolean);
  },

  /** 热门博客 */
  findHot(limit = 5) {
    return db.query(
      `SELECT b.id, b.title, b.view_count AS viewCount, b.like_count AS likeCount
       FROM blogs b WHERE b.status = 'published'
       ORDER BY b.view_count DESC, b.like_count DESC LIMIT ${Number(limit)}`
    );
  },

  async countAll(status) {
    const sql = status ? 'SELECT COUNT(*) AS total FROM blogs WHERE status = ?' : 'SELECT COUNT(*) AS total FROM blogs';
    const row = await db.queryOne(sql, status ? [status] : []);
    return row ? row.total : 0;
  },

  async countByDate(date) {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM blogs WHERE DATE(created_at) = ?', [date]);
    return row ? row.total : 0;
  },

  async sumViews() {
    const row = await db.queryOne("SELECT COALESCE(SUM(view_count),0) AS total FROM blogs WHERE status='published'");
    return row ? Number(row.total) : 0;
  },

  /** 按分类统计（数据看板用） */
  countGroupByCategory() {
    return db.query(
      `SELECT c.name, COUNT(b.id) AS value
       FROM categories c LEFT JOIN blogs b ON b.category_id = c.id AND b.status = 'published'
       GROUP BY c.id, c.name ORDER BY value DESC`
    );
  },
};
