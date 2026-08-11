/**
 * 博客业务服务
 * 负责编排：权限校验 → 内容审核 → AI 自动增强 → 落库 → 缓存失效
 */
const blogDao = require('../dao/blog.dao');
const tagDao = require('../dao/tag.dao');
const categoryDao = require('../dao/category.dao');
const interactionDao = require('../dao/interaction.dao');
const moderationService = require('./moderation.service');
const aiService = require('./ai.service');
const aiConfigService = require('./aiConfig.service');
const cache = require('../config/redis');
const { errors } = require('../utils/response');
const { countWords, truncateText, stripTags, cacheKeyOf, splitList } = require('../utils/helper');
const logger = require('../utils/logger');

const LIST_CACHE_TTL = 60;     // 列表缓存 60 秒
const DETAIL_CACHE_TTL = 300;  // 详情缓存 5 分钟

/** 清除博客相关缓存 */
async function invalidateCache(blogId) {
  await Promise.all([
    cache.delByPattern('blog:list:*'),
    blogId ? cache.del(`blog:detail:${blogId}`) : Promise.resolve(),
    cache.del('blog:hot'),
  ]);
}

/** 给博客列表挂载标签与当前用户的互动状态 */
async function attachExtras(list, currentUserId) {
  if (!list.length) return list;
  const ids = list.map((b) => b.id);

  const [tagRows, likedIds] = await Promise.all([
    blogDao.findTagsByBlogIds(ids),
    currentUserId ? interactionDao.findLikedIds(currentUserId, 'blog', ids) : Promise.resolve([]),
  ]);

  const tagMap = new Map();
  for (const t of tagRows) {
    const key = String(t.blogId);
    if (!tagMap.has(key)) tagMap.set(key, []);
    tagMap.get(key).push({ id: t.id, name: t.name, color: t.color });
  }
  const likedSet = new Set(likedIds.map(String));

  return list.map((b) => ({
    ...b,
    tags: tagMap.get(String(b.id)) || [],
    liked: likedSet.has(String(b.id)),
  }));
}

module.exports = {
  /** 博客列表（带缓存） */
  async list(filter, pageOpt, currentUserId) {
    const cacheKey = cacheKeyOf('blog:list', { ...filter, ...pageOpt });

    // 登录用户需要个性化的 liked 状态，因此只缓存基础数据，互动状态实时查
    const base = await cache.wrap(cacheKey, LIST_CACHE_TTL, async () =>
      blogDao.findPage(filter, pageOpt)
    );
    const list = await attachExtras(base.list, currentUserId);
    return { list, total: base.total };
  },

  /** 博客详情 */
  async detail(id, currentUserId, clientIp) {
    const blog = await cache.wrap(`blog:detail:${id}`, DETAIL_CACHE_TTL, () => blogDao.findById(id));
    if (!blog) throw errors.notFound('文章不存在或已被删除');

    // 草稿与已下架内容仅作者本人和管理员可见
    if (blog.status !== 'published') {
      const isOwner = currentUserId && String(blog.userId) === String(currentUserId);
      if (!isOwner) throw errors.forbidden('该文章尚未发布');
    }

    // 异步记录浏览，不阻塞响应
    if (blog.status === 'published') {
      blogDao.incrView(id).catch(() => {});
      interactionDao.addViewLog({ userId: currentUserId, blogId: id, ip: clientIp }).catch(() => {});
    }

    const [tagRows, liked, favorited] = await Promise.all([
      blogDao.findTagsByBlogIds([id]),
      currentUserId ? interactionDao.findLike(currentUserId, 'blog', id) : Promise.resolve(null),
      currentUserId ? interactionDao.findFavorite(currentUserId, id) : Promise.resolve(null),
    ]);

    return {
      ...blog,
      tags: tagRows.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      liked: Boolean(liked),
      favorited: Boolean(favorited),
    };
  },

  /** 创建博客 */
  async create(userId, data) {
    const title = stripTags(data.title).trim();
    if (!title) throw errors.param('标题不能为空');

    const isPublish = data.status === 'published';

    // 发布前做内容审核；草稿不审核，允许自由创作
    if (isPublish) {
      const check = await moderationService.moderate(`${title}\n${data.content}`, { userId, scene: 'blog' });
      if (!check.pass) {
        throw errors.violation('内容未通过审核，请修改后重新发布', {
          risks: check.risks,
          suggestion: check.suggestion,
        });
      }
    }

    // 自动补全摘要与关键词
    let summary = data.summary ? stripTags(data.summary).slice(0, 900) : '';
    let keywords = splitList(data.keywords).join(',');

    if (isPublish) {
      const autoSummary = await aiConfigService.getBoolean('ai.auto_summary', true);
      if (autoSummary && (!summary || !keywords)) {
        try {
          const enriched = await aiService.autoEnrich({ content: data.content, userId });
          if (!summary) summary = enriched.summary;
          if (!keywords) keywords = enriched.keywords.join(',');
        } catch (err) {
          logger.warn(`自动生成摘要失败，使用截断兜底: ${err.message}`);
        }
      }
      if (!summary) summary = truncateText(data.content, 150);
    }

    const blogId = await blogDao.create({
      userId,
      categoryId: data.categoryId || null,
      title,
      summary,
      content: data.content,
      cover: data.cover || '',
      keywords,
      status: data.status || 'draft',
      auditStatus: isPublish ? 'pass' : 'pending',
      isAiAssisted: data.isAiAssisted ? 1 : 0,
      wordCount: countWords(data.content),
    });

    // 处理标签
    if (data.tags && data.tags.length) {
      const tagIds = await tagDao.ensureTags(data.tags);
      await blogDao.replaceTags(blogId, tagIds);
      await tagDao.refreshCount(tagIds);
    }
    if (data.categoryId) await categoryDao.refreshCount(data.categoryId);

    await invalidateCache();
    return blogDao.findById(blogId);
  },

  /** 更新博客 */
  async update(id, userId, isAdmin, data) {
    const blog = await blogDao.findOwner(id);
    if (!blog) throw errors.notFound('文章不存在');
    if (!isAdmin && String(blog.userId) !== String(userId)) {
      throw errors.forbidden('只能编辑自己的文章');
    }

    const isPublish = data.status === 'published';
    if (isPublish && data.content) {
      const check = await moderationService.moderate(`${data.title || ''}\n${data.content}`, { userId, scene: 'blog' });
      if (!check.pass) {
        throw errors.violation('内容未通过审核，请修改后重新发布', {
          risks: check.risks,
          suggestion: check.suggestion,
        });
      }
    }

    const payload = {};
    if (data.title !== undefined) payload.title = stripTags(data.title).trim();
    if (data.content !== undefined) {
      payload.content = data.content;
      payload.wordCount = countWords(data.content);
    }
    if (data.summary !== undefined) payload.summary = stripTags(data.summary).slice(0, 900);
    if (data.cover !== undefined) payload.cover = data.cover;
    if (data.categoryId !== undefined) payload.categoryId = data.categoryId || null;
    if (data.keywords !== undefined) payload.keywords = splitList(data.keywords).join(',');
    if (data.isAiAssisted !== undefined) payload.isAiAssisted = data.isAiAssisted ? 1 : 0;
    if (data.status !== undefined) {
      payload.status = data.status;
      payload.auditStatus = isPublish ? 'pass' : 'pending';
      // 首次发布时写入发布时间
      if (isPublish && blog.status !== 'published') payload.publishedAt = new Date();
    }

    await blogDao.update(id, payload);

    if (data.tags !== undefined) {
      const tagIds = await tagDao.ensureTags(data.tags || []);
      await blogDao.replaceTags(id, tagIds);
      await tagDao.refreshCount();
    }
    if (data.categoryId !== undefined) {
      await categoryDao.refreshCount(data.categoryId);
    }

    await invalidateCache(id);
    return blogDao.findById(id);
  },

  /** 删除博客 */
  async remove(id, userId, isAdmin) {
    const blog = await blogDao.findOwner(id);
    if (!blog) throw errors.notFound('文章不存在');
    if (!isAdmin && String(blog.userId) !== String(userId)) {
      throw errors.forbidden('只能删除自己的文章');
    }
    await blogDao.remove(id);
    await tagDao.refreshCount();
    await invalidateCache(id);
    return true;
  },

  /** 修改发布状态（发布 / 下架） */
  async changeStatus(id, userId, isAdmin, status) {
    const blog = await blogDao.findOwner(id);
    if (!blog) throw errors.notFound('文章不存在');
    if (!isAdmin && String(blog.userId) !== String(userId)) {
      throw errors.forbidden('没有操作权限');
    }
    const payload = { status };
    if (status === 'published' && blog.status !== 'published') payload.publishedAt = new Date();
    await blogDao.update(id, payload);
    await invalidateCache(id);
    return true;
  },

  /** 置顶 / 取消置顶（管理员） */
  async setTop(id, isTop) {
    const blog = await blogDao.findOwner(id);
    if (!blog) throw errors.notFound('文章不存在');
    await blogDao.update(id, { isTop: isTop ? 1 : 0 });
    await invalidateCache(id);
    return true;
  },

  /** 相关文章 */
  async related(id, limit = 6) {
    const blog = await blogDao.findOwner(id);
    if (!blog) return [];
    const detail = await blogDao.findById(id);
    return blogDao.findRelated(id, detail ? detail.categoryId : null, limit);
  },

  /** 我的博客列表（含草稿） */
  async myList(userId, filter, pageOpt) {
    const result = await blogDao.findPage({ ...filter, userId }, pageOpt);
    const list = await attachExtras(result.list, userId);
    return { list, total: result.total };
  },

  /** 热门博客 */
  async hot(limit = 5) {
    return cache.wrap('blog:hot', 300, () => blogDao.findHot(limit));
  },

  invalidateCache,
  attachExtras,
};
