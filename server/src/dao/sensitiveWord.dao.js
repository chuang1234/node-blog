/**
 * 敏感词数据访问层
 */
const db = require('../config/db');

module.exports = {
  findEnabled() {
    return db.query(
      'SELECT id, word, category, level FROM sensitive_words WHERE enabled = 1 ORDER BY level DESC'
    );
  },

  async findPage({ keyword, category, offset = 0, pageSize = 20 }) {
    const where = ['1=1'];
    const params = [];
    if (keyword) {
      where.push('word LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    const whereSql = where.join(' AND ');
    const list = await db.query(
      `SELECT id, word, category, level, enabled, created_at AS createdAt
       FROM sensitive_words WHERE ${whereSql}
       ORDER BY id DESC LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(
      `SELECT COUNT(*) AS total FROM sensitive_words WHERE ${whereSql}`,
      params
    );
    return { list, total: countRow ? countRow.total : 0 };
  },

  async create({ word, category = 'other', level = 1 }) {
    const result = await db.execute(
      'INSERT INTO sensitive_words (word, category, level) VALUES (?, ?, ?)',
      [word, category, level]
    );
    return result.insertId;
  },

  async update(id, { category, level, enabled }) {
    const sets = [];
    const params = [];
    if (category !== undefined) { sets.push('category = ?'); params.push(category); }
    if (level !== undefined) { sets.push('level = ?'); params.push(level); }
    if (enabled !== undefined) { sets.push('enabled = ?'); params.push(enabled ? 1 : 0); }
    if (!sets.length) return 0;
    params.push(id);
    const result = await db.execute(`UPDATE sensitive_words SET ${sets.join(', ')} WHERE id = ?`, params);
    return result.affectedRows;
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM sensitive_words WHERE id = ?', [id]);
    return result.affectedRows;
  },
};
