/**
 * 分类数据访问层
 */
const db = require('../config/db');

const FIELDS = `id, name, slug, description, icon, sort_order AS sortOrder,
  blog_count AS blogCount, created_at AS createdAt`;

module.exports = {
  findAll() {
    return db.query(`SELECT ${FIELDS} FROM categories ORDER BY sort_order ASC, id ASC`);
  },

  findById(id) {
    return db.queryOne(`SELECT ${FIELDS} FROM categories WHERE id = ?`, [id]);
  },

  findBySlug(slug) {
    return db.queryOne(`SELECT ${FIELDS} FROM categories WHERE slug = ?`, [slug]);
  },

  findByName(name) {
    return db.queryOne('SELECT id FROM categories WHERE name = ?', [name]);
  },

  async create({ name, slug, description = '', icon = '', sortOrder = 0 }) {
    const result = await db.execute(
      'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description, icon, sortOrder]
    );
    return result.insertId;
  },

  async update(id, data) {
    const map = { name: 'name', slug: 'slug', description: 'description', icon: 'icon', sortOrder: 'sort_order' };
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(data[key]);
      }
    }
    if (!sets.length) return 0;
    params.push(id);
    const result = await db.execute(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);
    return result.affectedRows;
  },

  async remove(id) {
    const result = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows;
  },

  /** 重算某分类下的已发布博客数 */
  refreshCount(id) {
    return db.execute(
      `UPDATE categories c SET c.blog_count =
        (SELECT COUNT(*) FROM blogs b WHERE b.category_id = c.id AND b.status = 'published')
       WHERE c.id = ?`,
      [id]
    );
  },
};
