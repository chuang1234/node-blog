/**
 * 分类与标签服务
 */
const categoryDao = require('../dao/category.dao');
const tagDao = require('../dao/tag.dao');
const cache = require('../config/redis');
const { errors } = require('../utils/response');
const { stripTags } = require('../utils/helper');

/** 由中文名生成 slug（无中文转拼音库时用拼接兜底，保证唯一） */
function makeSlug(name, fallbackSeed) {
  const ascii = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `cat-${fallbackSeed || Date.now().toString(36)}`;
}

module.exports = {
  // ---------------- 分类 ----------------
  async listCategories() {
    return cache.wrap('category:all', 600, () => categoryDao.findAll());
  },

  /** 按 slug 获取单个分类（公开页面用）；不存在抛 404 */
  async getCategoryBySlug(slug) {
    const c = await categoryDao.findBySlug(slug);
    if (!c) throw errors.notFound('分类不存在');
    return c;
  },

  async createCategory(data) {
    const name = stripTags(data.name).trim();
    if (!name) throw errors.param('分类名称不能为空');
    if (await categoryDao.findByName(name)) throw errors.conflict('该分类已存在');

    const slug = data.slug ? makeSlug(data.slug) : makeSlug(name);
    if (await categoryDao.findBySlug(slug)) throw errors.conflict('该分类标识(slug)已被占用');

    const id = await categoryDao.create({
      name,
      slug,
      description: stripTags(data.description || '').slice(0, 255),
      icon: data.icon || '',
      sortOrder: data.sortOrder || 0,
    });
    await cache.del('category:all');
    return categoryDao.findById(id);
  },

  async updateCategory(id, data) {
    const exist = await categoryDao.findById(id);
    if (!exist) throw errors.notFound('分类不存在');

    if (data.name && data.name !== exist.name) {
      const dup = await categoryDao.findByName(data.name);
      if (dup) throw errors.conflict('该分类名称已存在');
    }
    await categoryDao.update(id, {
      ...data,
      name: data.name ? stripTags(data.name).trim() : undefined,
      description: data.description !== undefined ? stripTags(data.description).slice(0, 255) : undefined,
    });
    await cache.del('category:all');
    return categoryDao.findById(id);
  },

  async removeCategory(id) {
    const exist = await categoryDao.findById(id);
    if (!exist) throw errors.notFound('分类不存在');
    if (exist.blogCount > 0) {
      throw errors.param(`该分类下还有 ${exist.blogCount} 篇文章，请先转移或删除后再操作`);
    }
    await categoryDao.remove(id);
    await cache.del('category:all');
    return true;
  },

  // ---------------- 标签 ----------------
  async listTags(limit) {
    return cache.wrap(`tag:all:${limit || 200}`, 600, () => tagDao.findAll(limit));
  },

  /** 按名称获取单个标签（公开页面用）；不存在抛 404 */
  async getTagByName(name) {
    const t = await tagDao.findByName(name);
    if (!t) throw errors.notFound('标签不存在');
    return t;
  },

  async hotTags(limit = 20) {
    return cache.wrap(`tag:hot:${limit}`, 600, () => tagDao.findHot(limit));
  },

  async createTag(data) {
    const name = stripTags(data.name).trim().slice(0, 40);
    if (!name) throw errors.param('标签名称不能为空');
    if (await tagDao.findByName(name)) throw errors.conflict('该标签已存在');
    const id = await tagDao.create({ name, color: data.color || 'blue' });
    await cache.delByPattern('tag:*');
    return tagDao.findById(id);
  },

  async removeTag(id) {
    const exist = await tagDao.findById(id);
    if (!exist) throw errors.notFound('标签不存在');
    await tagDao.remove(id);
    await cache.delByPattern('tag:*');
    return true;
  },
};
