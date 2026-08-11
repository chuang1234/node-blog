/**
 * 评论与互动业务服务
 */
const commentDao = require('../dao/comment.dao');
const blogDao = require('../dao/blog.dao');
const interactionDao = require('../dao/interaction.dao');
const moderationService = require('./moderation.service');
const aiService = require('./ai.service');
const aiConfigService = require('./aiConfig.service');
const { errors } = require('../utils/response');
const { stripTags } = require('../utils/helper');
const logger = require('../utils/logger');
const cache = require('../config/redis');

module.exports = {
  /** 评论列表（含楼中楼） */
  async list(blogId, pageOpt, currentUserId) {
    const { list, total } = await commentDao.findRootPage(blogId, pageOpt);
    if (!list.length) return { list: [], total };

    const rootIds = list.map((c) => c.id);
    const replies = await commentDao.findRepliesByRootIds(rootIds);

    // 查询当前用户点赞状态
    const allIds = [...rootIds, ...replies.map((r) => r.id)];
    const likedIds = currentUserId
      ? await interactionDao.findLikedIds(currentUserId, 'comment', allIds)
      : [];
    const likedSet = new Set(likedIds.map(String));

    const replyMap = new Map();
    for (const r of replies) {
      const key = String(r.rootId);
      if (!replyMap.has(key)) replyMap.set(key, []);
      replyMap.get(key).push({ ...r, liked: likedSet.has(String(r.id)) });
    }

    return {
      list: list.map((c) => ({
        ...c,
        liked: likedSet.has(String(c.id)),
        replies: replyMap.get(String(c.id)) || [],
        replyCount: (replyMap.get(String(c.id)) || []).length,
      })),
      total,
    };
  },

  /**
   * 发表评论
   * 流程：内容审核 → 落库 → 异步情感分析 → 可选 AI 自动回复
   */
  async create(userId, { blogId, content, parentId }) {
    const blog = await blogDao.findOwner(blogId);
    if (!blog) throw errors.notFound('文章不存在');
    if (blog.status !== 'published') throw errors.forbidden('该文章暂不支持评论');

    const clean = stripTags(content).trim();
    if (!clean) throw errors.param('评论内容不能为空');

    // 内容审核
    const check = await moderationService.moderate(clean, { userId });
    if (!check.pass) {
      throw errors.violation('评论包含违规内容，已被拦截', {
        risks: check.risks,
        suggestion: check.suggestion,
      });
    }
    // 中低风险内容使用脱敏后的文本
    const finalContent = check.masked || clean;

    // 处理层级关系：统一为二级结构（根评论 + 回复）
    let rootId = null;
    if (parentId) {
      const parent = await commentDao.findById(parentId);
      if (!parent) throw errors.notFound('要回复的评论不存在');
      if (String(parent.blogId) !== String(blogId)) throw errors.param('评论与文章不匹配');
      rootId = parent.rootId || parent.id;
    }

    const commentId = await commentDao.create({
      blogId,
      userId,
      parentId: parentId || null,
      rootId,
      content: finalContent,
    });

    await blogDao.incrCounter(blogId, 'comment', 1);
    await cache.del(`blog:detail:${blogId}`);

    // 异步执行情感分析与自动回复，不阻塞用户提交
    this.postProcess(commentId, blogId, finalContent, userId).catch((err) =>
      logger.warn(`评论后处理失败: ${err.message}`)
    );

    return commentDao.findById(commentId);
  },

  /**
   * 评论后处理（异步）
   * 1. AI 情感分析并写回
   * 2. 若开启自动回复且命中回复范围，生成 AI 回复
   */
  async postProcess(commentId, blogId, content, userId) {
    // 情感分析
    const senti = await aiService.analyzeSentiment({ text: content, userId });
    if (senti.sentiment !== 'unknown') {
      await commentDao.updateSentiment(commentId, senti.sentiment, senti.score);
    }

    // 自动回复
    const autoReply = await aiConfigService.getBoolean('ai.auto_reply_comment', false);
    if (!autoReply) return;

    const scope = await aiConfigService.getString('ai.reply_scope', 'positive');
    const isQuestion = /[?？]|请问|怎么|如何|为什么|能不能/.test(content);
    const shouldReply =
      scope === 'all' ||
      (scope === 'positive' && senti.sentiment === 'positive') ||
      (scope === 'question' && isQuestion);

    if (!shouldReply) return;

    const blog = await blogDao.findById(blogId);
    if (!blog) return;

    const tone = await aiConfigService.getString('ai.reply_tone', 'friendly');
    const result = await aiService.replyComment({
      blogId,
      comment: content,
      tone,
      authorName: blog.authorName,
      userId: blog.userId,
    });

    // AI 回复以文章作者的身份发出，并标记 is_ai_reply
    await commentDao.create({
      blogId,
      userId: blog.userId,
      parentId: commentId,
      rootId: commentId,
      content: result.reply,
      sentiment: 'neutral',
      sentimentScore: 0,
      isAiReply: true,
    });
    await blogDao.incrCounter(blogId, 'comment', 1);
    await cache.del(`blog:detail:${blogId}`);
    logger.info(`[AI 自动回复] 已回复评论 #${commentId}`);
  },

  /**
   * 作者手动采用 AI 生成的回复
   */
  async replyWithAi(userId, { commentId, tone }) {
    const target = await commentDao.findById(commentId);
    if (!target) throw errors.notFound('评论不存在');

    const blog = await blogDao.findById(target.blogId);
    if (!blog) throw errors.notFound('文章不存在');
    if (String(blog.userId) !== String(userId)) {
      throw errors.forbidden('只有文章作者可以使用 AI 回复');
    }

    const result = await aiService.replyComment({
      blogId: target.blogId,
      comment: target.content,
      tone,
      authorName: blog.authorName,
      userId,
    });
    return result;
  },

  /** 删除评论（作者本人、文章作者或管理员） */
  async remove(commentId, userId, isAdmin) {
    const comment = await commentDao.findById(commentId);
    if (!comment) throw errors.notFound('评论不存在');

    const blog = await blogDao.findOwner(comment.blogId);
    const isCommentOwner = String(comment.userId) === String(userId);
    const isBlogOwner = blog && String(blog.userId) === String(userId);

    if (!isAdmin && !isCommentOwner && !isBlogOwner) {
      throw errors.forbidden('没有删除权限');
    }

    await commentDao.remove(commentId);
    // 删除根评论会级联删除其下回复，因此重新统计真实数量而非简单减一
    const realCount = await commentDao.countByBlog(comment.blogId);
    await blogDao.setCounter(comment.blogId, 'comment', realCount);
    await cache.del(`blog:detail:${comment.blogId}`);
    return true;
  },

  /** 举报评论 */
  async report(userId, { commentId, reason }) {
    const comment = await commentDao.findById(commentId);
    if (!comment) throw errors.notFound('评论不存在');

    await interactionDao.addReport({
      userId,
      targetType: 'comment',
      targetId: commentId,
      reason: stripTags(reason).slice(0, 500),
    });
    await commentDao.incrReport(commentId);
    return true;
  },

  // ---------------- 点赞 / 收藏 ----------------

  /** 点赞或取消点赞（幂等切换） */
  async toggleLike(userId, targetType, targetId) {
    if (!['blog', 'comment'].includes(targetType)) throw errors.param('非法的点赞目标类型');

    if (targetType === 'blog') {
      const blog = await blogDao.findOwner(targetId);
      if (!blog) throw errors.notFound('文章不存在');
    } else {
      const comment = await commentDao.findById(targetId);
      if (!comment) throw errors.notFound('评论不存在');
    }

    const existed = await interactionDao.findLike(userId, targetType, targetId);
    if (existed) {
      await interactionDao.removeLike(userId, targetType, targetId);
      if (targetType === 'blog') await blogDao.incrCounter(targetId, 'like', -1);
      else await commentDao.incrLike(targetId, -1);
      if (targetType === 'blog') await cache.del(`blog:detail:${targetId}`);
      return { liked: false };
    }

    await interactionDao.addLike(userId, targetType, targetId);
    if (targetType === 'blog') await blogDao.incrCounter(targetId, 'like', 1);
    else await commentDao.incrLike(targetId, 1);
    if (targetType === 'blog') await cache.del(`blog:detail:${targetId}`);
    return { liked: true };
  },

  /** 收藏或取消收藏 */
  async toggleFavorite(userId, blogId) {
    const blog = await blogDao.findOwner(blogId);
    if (!blog) throw errors.notFound('文章不存在');

    const existed = await interactionDao.findFavorite(userId, blogId);
    if (existed) {
      await interactionDao.removeFavorite(userId, blogId);
      await blogDao.incrCounter(blogId, 'favorite', -1);
      await cache.del(`blog:detail:${blogId}`);
      return { favorited: false };
    }
    await interactionDao.addFavorite(userId, blogId);
    await blogDao.incrCounter(blogId, 'favorite', 1);
    await cache.del(`blog:detail:${blogId}`);
    return { favorited: true };
  },

  /** 我的收藏 */
  async myFavorites(userId, pageOpt) {
    return interactionDao.findFavoritePage(userId, pageOpt);
  },
};
