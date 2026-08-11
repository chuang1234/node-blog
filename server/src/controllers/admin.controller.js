/**
 * 后台管理控制器：数据看板、AI 参数配置、敏感词、AI 日志
 */
const statsService = require('../services/stats.service');
const aiConfigService = require('../services/aiConfig.service');
const moderationService = require('../services/moderation.service');
const sensitiveWordDao = require('../dao/sensitiveWord.dao');
const aiLogDao = require('../dao/aiLog.dao');
const { success, page } = require('../utils/response');
const { asyncHandler } = require('../middlewares/error');
const { normalizePage } = require('../utils/helper');

module.exports = {
  // ---------------- 数据看板 ----------------
  overview: asyncHandler(async (req, res) => {
    const data = await statsService.overview();
    return success(res, data);
  }),

  trend: asyncHandler(async (req, res) => {
    const data = await statsService.trend(req.query.days || 7);
    return success(res, data);
  }),

  distribution: asyncHandler(async (req, res) => {
    const data = await statsService.distribution();
    return success(res, data);
  }),

  /** 手动触发某日统计快照 */
  generateSnapshot: asyncHandler(async (req, res) => {
    const data = await statsService.generateDailySnapshot(req.body.date);
    return success(res, data, '统计快照已生成');
  }),

  // ---------------- AI 配置 ----------------
  aiConfigList: asyncHandler(async (req, res) => {
    const list = await aiConfigService.list();
    return success(res, list);
  }),

  aiConfigSave: asyncHandler(async (req, res) => {
    const count = await aiConfigService.saveBatch(req.body.items);
    return success(res, { count }, `已保存 ${count} 项配置`);
  }),

  // ---------------- AI 调用日志 ----------------
  aiLogList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await aiLogDao.findPage({ ...req.query, offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  aiLogSummary: asyncHandler(async (req, res) => {
    const [summary, byAction] = await Promise.all([
      aiLogDao.summary(30),
      aiLogDao.countGroupByAction(30),
    ]);
    return success(res, {
      totalCalls: Number(summary?.totalCalls || 0),
      totalTokens: Number(summary?.totalTokens || 0),
      avgDuration: Math.round(Number(summary?.avgDuration || 0)),
      failedCount: Number(summary?.failedCount || 0),
      byAction: byAction.map((a) => ({ name: a.name, value: Number(a.value) })),
    });
  }),

  // ---------------- 敏感词 ----------------
  wordList: asyncHandler(async (req, res) => {
    const { pageNum, pageSize, offset } = normalizePage(req.query);
    const { list, total } = await sensitiveWordDao.findPage({ ...req.query, offset, pageSize });
    return page(res, { list, total, pageNum, pageSize });
  }),

  wordCreate: asyncHandler(async (req, res) => {
    const id = await sensitiveWordDao.create(req.body);
    moderationService.invalidateWords();
    return success(res, { id }, '敏感词已添加');
  }),

  wordUpdate: asyncHandler(async (req, res) => {
    await sensitiveWordDao.update(req.params.id, req.body);
    moderationService.invalidateWords();
    return success(res, null, '敏感词已更新');
  }),

  wordRemove: asyncHandler(async (req, res) => {
    await sensitiveWordDao.remove(req.params.id);
    moderationService.invalidateWords();
    return success(res, null, '敏感词已删除');
  }),
};
