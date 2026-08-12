/**
 * 标签数据访问层
 */
const db = require('../config/db');

const FIELDS = 'id, name, color, ref_count AS refCount, created_at AS createdAt';

module.exports = {
  findAll(limit = 200) {
    return db.query(`SELECT ${FIELDS} FROM tags ORDER BY ref_count DESC, id ASC LIMIT ${Number(limit)}`);
  },

  findHot(limit = 20) {
    return db.query(`SELECT ${FIELDS} FROM tags ORDER BY ref_count DESC LIMIT ${Number(limit)}`);
  },

  findById(id) {
    return db.queryOne(`SELECT ${FIELDS} FROM tags WHERE id = ?`, [id]);
  },

  findByName(name) {
    return db.queryOne(`SELECT ${FIELDS} FROM tags WHERE name = ?`, [name]);
  },

  async create({ name, color = 'blue' }) {
    const result = await db.execute('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color]);
    return result.insertId;
  },

  /**
   * 按名称批量获取或创建标签，返回标签 ID 数组
   * 用于博客保存时的标签处理
   */
  async ensureTags(names = []) {
    const ids = [];
    for (const raw of names) {
      const name = String(raw).trim().slice(0, 40);
      if (!name) continue;
      const exist = await this.findByName(name);
      if (exist) {
        ids.push(exist.id);
      } else {
        // 并发场景下可能重复插入，用 INSERT IGNORE 兜底
        await db.execute('INSERT IGNORE INTO tags (name) VALUES (?)', [name]);
        const created = await this.findByName(name);
        if (created) ids.push(created.id);
      }
    }
    return [...new Set(ids)];
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM tags WHERE id = ?', [id]);
    return result.affectedRows;
  },

  /** 重算引用计数（仅统计已发布文章，与分类计数口径保持一致） */
  refreshCount(ids = []) {
    // 只统计关联且已发布的博客，避免下线的文章仍计入标签数
    const join = "blog_tags bt JOIN blogs b ON b.id = bt.blog_id AND b.status = 'published'";
    if (!ids.length) {
      return db.execute(
        `UPDATE tags t SET t.ref_count = (SELECT COUNT(*) FROM ${join} WHERE bt.tag_id = t.id)`
      );
    }
    const placeholders = ids.map(() => '?').join(',');
    return db.execute(
      `UPDATE tags t SET t.ref_count = (SELECT COUNT(*) FROM ${join} WHERE bt.tag_id = t.id)
       WHERE t.id IN (${placeholders})`,
      ids
    );
  },
};
