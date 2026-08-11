/**
 * 分类与标签控制器
 */
const categoryService = require('../services/category.service');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');

module.exports = {
  listCategories: asyncHandler(async (req, res) => {
    const list = await categoryService.listCategories();
    return success(res, list);
  }),

  createCategory: asyncHandler(async (req, res) => {
    const data = await categoryService.createCategory(req.body);
    return success(res, data, '分类创建成功');
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const data = await categoryService.updateCategory(req.params.id, req.body);
    return success(res, data, '分类已更新');
  }),

  removeCategory: asyncHandler(async (req, res) => {
    await categoryService.removeCategory(req.params.id);
    return success(res, null, '分类已删除');
  }),

  listTags: asyncHandler(async (req, res) => {
    const list = await categoryService.listTags(200);
    return success(res, list);
  }),

  hotTags: asyncHandler(async (req, res) => {
    const list = await categoryService.hotTags(20);
    return success(res, list);
  }),

  createTag: asyncHandler(async (req, res) => {
    const data = await categoryService.createTag(req.body);
    return success(res, data, '标签创建成功');
  }),

  removeTag: asyncHandler(async (req, res) => {
    await categoryService.removeTag(req.params.id);
    return success(res, null, '标签已删除');
  }),

  /** 分页返回标签（管理端） */
  adminTagPage: asyncHandler(async (req, res) => {
    const { pageNum, pageSize } = normalizePage(req.query);
    const all = await categoryService.listTags(500);
    const start = (pageNum - 1) * pageSize;
    return page(res, {
      list: all.slice(start, start + pageSize),
      total: all.length,
      pageNum,
      pageSize,
    });
  }),
};
