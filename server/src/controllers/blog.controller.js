/**
 * 博客控制器
 */
const blogService = require('../services/blog.service');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');
const { getClientIp } = require('../middlewares/rateLimit');
const { toPublicUrl } = require('../middlewares/upload');

/** 从 query 中提取过滤条件 */
function pickFilter(query) {
  const filter = {};
  if (query.keyword) filter.keyword = query.keyword;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.tagId) filter.tagId = query.tagId;
  if (query.userId) filter.userId = query.userId;
  return filter;
}

module.exports = {
  /** 公开列表：仅返回已发布内容 */
  list: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const filter = { ...pickFilter(req.query), status: 'published' };
    const { list, total } = await blogService.list(
      filter,
      { offset, pageSize, orderBy: req.query.orderBy || 'latest' },
      req.user ? req.user.id : null
    );
    return page(res, { list, total, pageNum, pageSize });
  }),

  /** 详情 */
  detail: asyncHandler(async (req, res) => {
    const blog = await blogService.detail(
      req.params.id,
      req.user ? req.user.id : null,
      getClientIp(req)
    );
    return success(res, blog);
  }),

  create: asyncHandler(async (req, res) => {
    const blog = await blogService.create(req.user.id, req.body);
    return success(res, blog, req.body.status === 'published' ? '发布成功' : '草稿已保存');
  }),

  update: asyncHandler(async (req, res) => {
    const blog = await blogService.update(
      req.params.id,
      req.user.id,
      req.user.role === 'admin',
      req.body
    );
    return success(res, blog, '保存成功');
  }),

  remove: asyncHandler(async (req, res) => {
    await blogService.remove(req.params.id, req.user.id, req.user.role === 'admin');
    return success(res, null, '文章已删除');
  }),

  changeStatus: asyncHandler(async (req, res) => {
    await blogService.changeStatus(
      req.params.id,
      req.user.id,
      req.user.role === 'admin',
      req.body.status
    );
    const msgMap = { published: '文章已发布', offline: '文章已下架', draft: '已转为草稿' };
    return success(res, null, msgMap[req.body.status] || '状态已更新');
  }),

  /** 我的文章（含草稿） */
  myList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.keyword) filter.keyword = req.query.keyword;

    const { list, total } = await blogService.myList(req.user.id, filter, {
      offset,
      pageSize,
      orderBy: req.query.orderBy || 'updated',
    });
    return page(res, { list, total, pageNum, pageSize });
  }),

  related: asyncHandler(async (req, res) => {
    const list = await blogService.related(req.params.id, 6);
    return success(res, list);
  }),

  hot: asyncHandler(async (req, res) => {
    const list = await blogService.hot(8);
    return success(res, list);
  }),

  /** 上传封面 */
  uploadCover: asyncHandler(async (req, res) => {
    if (!req.file) return success(res, null, '请选择要上传的图片');
    return success(res, { url: toPublicUrl('cover', req.file.filename) }, '封面上传成功');
  }),

  // ---------------- 管理端 ----------------
  adminList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const filter = pickFilter(req.query);
    if (req.query.status) filter.status = req.query.status;

    const { list, total } = await blogService.list(
      filter,
      { offset, pageSize, orderBy: req.query.orderBy || 'updated' },
      req.user.id
    );
    return page(res, { list, total, pageNum, pageSize });
  }),

  adminSetTop: asyncHandler(async (req, res) => {
    await blogService.setTop(req.params.id, req.body.isTop);
    return success(res, null, req.body.isTop ? '已置顶' : '已取消置顶');
  }),
};
