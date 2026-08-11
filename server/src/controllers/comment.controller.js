/**
 * 评论与互动控制器
 */
const commentService = require('../services/comment.service');
const commentDao = require('../dao/comment.dao');
const interactionDao = require('../dao/interaction.dao');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');

module.exports = {
  /** 某篇文章的评论列表 */
  list: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await commentService.list(
      req.params.blogId,
      { offset, pageSize, orderBy: req.query.orderBy, sentiment: req.query.sentiment },
      req.user ? req.user.id : null
    );
    return page(res, { list, total, pageNum, pageSize });
  }),

  create: asyncHandler(async (req, res) => {
    const comment = await commentService.create(req.user.id, req.body);
    return success(res, comment, '评论发表成功');
  }),

  remove: asyncHandler(async (req, res) => {
    await commentService.remove(req.params.id, req.user.id, req.user.role === 'admin');
    return success(res, null, '评论已删除');
  }),

  report: asyncHandler(async (req, res) => {
    await commentService.report(req.user.id, {
      commentId: req.params.id,
      reason: req.body.reason,
    });
    return success(res, null, '举报已提交，我们会尽快处理');
  }),

  /** 作者使用 AI 生成回复内容（仅返回草稿，不直接发布） */
  aiReply: asyncHandler(async (req, res) => {
    const result = await commentService.replyWithAi(req.user.id, req.body);
    return success(res, result);
  }),

  // ---------------- 点赞 / 收藏 ----------------
  toggleLike: asyncHandler(async (req, res) => {
    const result = await commentService.toggleLike(
      req.user.id,
      req.params.targetType,
      req.params.targetId
    );
    return success(res, result, result.liked ? '点赞成功' : '已取消点赞');
  }),

  toggleFavorite: asyncHandler(async (req, res) => {
    const result = await commentService.toggleFavorite(req.user.id, req.params.blogId);
    return success(res, result, result.favorited ? '收藏成功' : '已取消收藏');
  }),

  myFavorites: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await commentService.myFavorites(req.user.id, { offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  // ---------------- 管理端 ----------------
  adminList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await commentDao.findPage({ ...req.query, offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  adminUpdateStatus: asyncHandler(async (req, res) => {
    await commentDao.updateStatus(req.params.id, req.body.status);
    return success(res, null, '评论状态已更新');
  }),

  adminReportList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await interactionDao.findReportPage({
      status: req.query.status,
      offset,
      pageSize,
    });
    return page(res, { list, total, pageNum, pageSize });
  }),

  adminHandleReport: asyncHandler(async (req, res) => {
    await interactionDao.updateReportStatus(req.params.id, req.body.status || 'resolved');
    return success(res, null, '举报已处理');
  }),
};
