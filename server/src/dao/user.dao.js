/**
 * 用户数据访问层
 */
const db = require('../config/db');

/** 对外返回的安全字段（不含密码） */
const SAFE_FIELDS = `id, username, email, nickname, avatar, bio, role, status, ai_style AS aiStyle,
  last_login_at AS lastLoginAt, created_at AS createdAt, updated_at AS updatedAt`;

module.exports = {
  /** 按 ID 查询（含密码字段与概览聚合，供内部使用） */
  findById(id) {
    return db.queryOne(
      `SELECT ${SAFE_FIELDS}, password,
        (SELECT COUNT(*) FROM blogs b WHERE b.user_id = users.id) AS blogCount,
        (SELECT COALESCE(SUM(b.view_count), 0) FROM blogs b WHERE b.user_id = users.id) AS totalViews,
        (SELECT COALESCE(SUM(b.like_count), 0) FROM blogs b WHERE b.user_id = users.id) AS totalLikes
       FROM users WHERE id = ?`,
      [id]
    );
  },

  /** 按用户名或邮箱查询（登录用） */
  findByAccount(account) {
    return db.queryOne(
      `SELECT ${SAFE_FIELDS}, password FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [account, account]
    );
  },

  findByUsername(username) {
    return db.queryOne('SELECT id FROM users WHERE username = ?', [username]);
  },

  findByEmail(email) {
    return db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
  },

  /** 创建用户 */
  async create({ username, email, password, nickname, avatar = '', role = 'user' }) {
    const result = await db.execute(
      `INSERT INTO users (username, email, password, nickname, avatar, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, password, nickname || username, avatar, role]
    );
    return result.insertId;
  },

  /** 更新个人资料（仅允许白名单字段） */
  async updateProfile(id, data) {
    const allow = ['nickname', 'avatar', 'bio', 'email', 'ai_style'];
    const sets = [];
    const params = [];
    for (const key of allow) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (!sets.length) return 0;
    params.push(id);
    const result = await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    return result.affectedRows;
  },

  async updatePassword(id, hashed) {
    const result = await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);
    return result.affectedRows;
  },

  async updateLoginTime(id) {
    return db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  async updateStatus(id, status) {
    const result = await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
  },

  async updateRole(id, role) {
    const result = await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return result.affectedRows;
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
  },

  /** 管理端分页查询 */
  async findPage({ keyword, role, status, offset, pageSize }) {
    const where = ['1=1'];
    const params = [];
    if (keyword) {
      where.push('(username LIKE ? OR nickname LIKE ? OR email LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (role) {
      where.push('role = ?');
      params.push(role);
    }
    if (status !== undefined && status !== '') {
      where.push('status = ?');
      params.push(Number(status));
    }
    const whereSql = where.join(' AND ');

    const list = await db.query(
      `SELECT ${SAFE_FIELDS},
        (SELECT COUNT(*) FROM blogs b WHERE b.user_id = users.id) AS blogCount
       FROM users WHERE ${whereSql}
       ORDER BY created_at DESC LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(`SELECT COUNT(*) AS total FROM users WHERE ${whereSql}`, params);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 用户公开信息（他人主页展示） */
  findPublicById(id) {
    return db.queryOne(
      `SELECT id, username, nickname, avatar, bio, created_at AS createdAt,
        (SELECT COUNT(*) FROM blogs b WHERE b.user_id = users.id AND b.status = 'published') AS blogCount,
        (SELECT COALESCE(SUM(b.view_count), 0) FROM blogs b WHERE b.user_id = users.id AND b.status = 'published') AS totalViews,
        (SELECT COALESCE(SUM(b.like_count), 0) FROM blogs b WHERE b.user_id = users.id AND b.status = 'published') AS totalLikes
       FROM users WHERE id = ? AND status = 1`,
      [id]
    );
  },

  /** 统计总用户数 */
  async countAll() {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM users');
    return row ? row.total : 0;
  },

  /** 统计某天新增用户 */
  async countByDate(date) {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM users WHERE DATE(created_at) = ?', [date]);
    return row ? row.total : 0;
  },
};
