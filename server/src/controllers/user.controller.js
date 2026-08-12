/**
 * 用户控制器
 */
const userService = require('../services/user.service');
const interactionDao = require('../dao/interaction.dao');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');
const { toPublicUrl } = require('../middlewares/upload');

module.exports = {
  register: asyncHandler(async (req, res) => {
    const result = await userService.register(req.body);
    return success(res, result, '注册成功');
  }),

  login: asyncHandler(async (req, res) => {
    const result = await userService.login(req.body);
    return success(res, result, '登录成功');
  }),

  /** 获取当前登录用户信息 */
  me: asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);
    return success(res, user);
  }),

  /** 查看他人主页 */
  publicProfile: asyncHandler(async (req, res) => {
    const user = await userService.getPublicProfile(req.params.id, req.user?.id);
    return success(res, user);
  }),

  /** 查看他人的收藏列表（公开） */
  userFavorites: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await interactionDao.findFavoritePage(req.params.id, { offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  /** 查看他人点赞过的文章（公开，仅已发布） */
  userLikes: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await interactionDao.findLikedBlogsPage(req.params.id, { offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    return success(res, user, '资料已更新');
  }),

  changePassword: asyncHandler(async (req, res) => {
    await userService.changePassword(req.user.id, req.body);
    return success(res, null, '密码修改成功，请重新登录');
  }),

  /** 上传头像 */
  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) return success(res, null, '请选择要上传的图片');
    const url = toPublicUrl('avatar', req.file.filename);
    await userService.updateAvatar(req.user.id, url);
    return success(res, { url }, '头像上传成功');
  }),

  // ---------------- 管理端 ----------------
  adminList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await userService.adminList({ ...req.query, offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  adminUpdate: asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.body.status !== undefined) {
      await userService.adminUpdateStatus(id, req.body.status, req.user.id);
    }
    if (req.body.role !== undefined) {
      await userService.adminUpdateRole(id, req.body.role, req.user.id);
    }
    return success(res, null, '用户信息已更新');
  }),

  adminRemove: asyncHandler(async (req, res) => {
    await userService.adminRemove(req.params.id, req.user.id);
    return success(res, null, '用户已删除');
  }),
};
