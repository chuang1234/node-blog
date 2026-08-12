/**
 * 站内通知控制器
 */
const notificationService = require('../services/notification.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');

module.exports = {
  /** 通知列表（带未读数） */
  list: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await notificationService.list(req.user.id, { offset, pageSize });
    const unreadCount = await notificationService.unreadCount(req.user.id);
    return res.json({
      code: 0,
      message: 'success',
      data: {
        list,
        unreadCount,
        pagination: {
          total: Number(total) || 0,
          pageNum: Number(pageNum) || 1,
          pageSize: Number(pageSize) || 10,
          totalPages: Math.ceil((Number(total) || 0) / (Number(pageSize) || 10)),
        },
      },
    });
  }),

  /** 仅未读数量（供顶栏轻量轮询） */
  unreadCount: asyncHandler(async (req, res) => {
    const unreadCount = await notificationService.unreadCount(req.user.id);
    return success(res, { unreadCount });
  }),

  /** 标记单条已读 */
  markRead: asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user.id, req.params.id);
    return success(res, null, '已标记为已读');
  }),

  /** 全部已读 */
  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.id);
    return success(res, null, '已全部标记为已读');
  }),

  /** 删除单条 */
  remove: asyncHandler(async (req, res) => {
    await notificationService.remove(req.user.id, req.params.id);
    return success(res, null, '已删除');
  }),
};
