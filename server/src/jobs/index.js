/**
 * 定时任务调度中心（node-schedule）
 *
 * 已注册任务：
 * 1. 每日 00:10 生成前一天的统计快照，写入 stats_daily 表
 * 2. 每日 03:00 清理 90 天前的浏览日志与 AI 调用日志，防止表无限膨胀
 * 3. 每小时刷新一次热门文章缓存，避免首屏冷启动
 */
const schedule = require('node-schedule');
const logger = require('../utils/logger');
const statsService = require('../services/stats.service');
const db = require('../config/db');
const cache = require('../config/redis');
const { formatDate } = require('../utils/helper');

/** 已注册的任务句柄，便于优雅关闭时统一取消 */
const jobs = [];

/** 生成昨日统计快照 */
async function runDailySnapshot() {
  const yesterday = formatDate(new Date(Date.now() - 86400000));
  try {
    const result = await statsService.generateDailySnapshot(yesterday);
    logger.info(
      `[定时任务] 已生成 ${result.date} 统计快照: PV=${result.pv} UV=${result.uv} 新增文章=${result.newBlogs}`
    );
  } catch (err) {
    logger.error(`[定时任务] 生成统计快照失败: ${err.message}`);
  }
}

/** 清理历史日志（保留 90 天） */
async function runLogCleanup() {
  try {
    const viewResult = await db.execute(
      'DELETE FROM view_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 20000'
    );
    const aiResult = await db.execute(
      'DELETE FROM ai_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 20000'
    );
    logger.info(
      `[定时任务] 日志清理完成: 浏览日志 ${viewResult.affectedRows} 条, AI 日志 ${aiResult.affectedRows} 条`
    );
  } catch (err) {
    logger.error(`[定时任务] 日志清理失败: ${err.message}`);
  }
}

/** 刷新热门文章缓存 */
async function runRefreshHotCache() {
  try {
    await cache.delByPattern('blog:hot*');
    await cache.delByPattern('stats:*');
    logger.debug('[定时任务] 热门缓存已刷新');
  } catch (err) {
    logger.warn(`[定时任务] 刷新热门缓存失败: ${err.message}`);
  }
}

/**
 * 启动全部定时任务
 * 生产环境多实例部署时，建议只在一个实例上开启（通过环境变量控制）
 */
function startJobs() {
  // 每天 00:10 执行
  jobs.push(schedule.scheduleJob('daily-snapshot', '10 0 * * *', runDailySnapshot));

  // 每天 03:00 执行
  jobs.push(schedule.scheduleJob('log-cleanup', '0 3 * * *', runLogCleanup));

  // 每小时的第 5 分钟执行
  jobs.push(schedule.scheduleJob('refresh-hot-cache', '5 * * * *', runRefreshHotCache));

  logger.info(`定时任务已启动，共 ${jobs.filter(Boolean).length} 个`);
}

/** 取消全部定时任务（优雅关闭时调用） */
async function stopJobs() {
  await schedule.gracefulShutdown();
  jobs.length = 0;
}

module.exports = {
  startJobs,
  stopJobs,
  // 导出供手动触发/测试
  runDailySnapshot,
  runLogCleanup,
  runRefreshHotCache,
};
