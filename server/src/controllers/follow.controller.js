/**
 * 关注关系控制器
 */
const followService = require('../services/follow.service');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');

module.exports = {
  /** 关注 */
  follow: asyncHandler(async (req, res) => {
    await followService.follow(req.user.id, Number(req.params.id));
    return success(res, null, '已关注');
  }),

  /** 取消关注 */
  unfollow: asyncHandler(async (req, res) => {
    await followService.unfollow(req.user.id, Number(req.params.id));
    return success(res, null, '已取消关注');
  }),

  /** 是否已关注（需登录） */
  isFollowing: asyncHandler(async (req, res) => {
    const following = await followService.isFollowing(req.user.id, Number(req.params.id));
    return success(res, { following });
  }),

  /** 粉丝列表（公开） */
  listFollowers: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await followService.listFollowers(Number(req.params.id), { offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  /** 关注列表（公开） */
  listFollowing: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await followService.listFollowing(Number(req.params.id), { offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),
};
