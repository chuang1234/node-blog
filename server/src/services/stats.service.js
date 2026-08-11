/**
 * 统计服务（后台数据看板）
 */
const userDao = require('../dao/user.dao');
const blogDao = require('../dao/blog.dao');
const commentDao = require('../dao/comment.dao');
const aiLogDao = require('../dao/aiLog.dao');
const interactionDao = require('../dao/interaction.dao');
const statsDao = require('../dao/stats.dao');
const cache = require('../config/redis');
const { formatDate } = require('../utils/helper');

module.exports = {
  /** 概览卡片数据 */
  async overview() {
    return cache.wrap('stats:overview', 120, async () => {
      const today = formatDate();
      const [
        totalUsers,
        totalBlogs,
        publishedBlogs,
        totalComments,
        totalViews,
        todayPv,
        todayUv,
        todayNewUsers,
        todayNewBlogs,
        todayNewComments,
        aiSummary,
      ] = await Promise.all([
        userDao.countAll(),
        blogDao.countAll(),
        blogDao.countAll('published'),
        commentDao.countAll(),
        blogDao.sumViews(),
        interactionDao.countPvByDate(today),
        interactionDao.countUvByDate(today),
        userDao.countByDate(today),
        blogDao.countByDate(today),
        commentDao.countByDate(today),
        aiLogDao.summary(30),
      ]);

      return {
        totalUsers,
        totalBlogs,
        publishedBlogs,
        draftBlogs: totalBlogs - publishedBlogs,
        totalComments,
        totalViews,
        today: {
          pv: todayPv,
          uv: todayUv,
          newUsers: todayNewUsers,
          newBlogs: todayNewBlogs,
          newComments: todayNewComments,
        },
        ai: {
          totalCalls: Number(aiSummary?.totalCalls || 0),
          totalTokens: Number(aiSummary?.totalTokens || 0),
          avgDuration: Math.round(Number(aiSummary?.avgDuration || 0)),
          failedCount: Number(aiSummary?.failedCount || 0),
        },
      };
    });
  },

  /** 趋势图数据 */
  async trend(days = 7) {
    return cache.wrap(`stats:trend:${days}`, 300, async () => {
      const [viewTrend, daily] = await Promise.all([
        interactionDao.findViewTrend(days),
        statsDao.findRecent(days),
      ]);

      // 以日期为轴合并两个数据源，补齐缺失日期
      const map = new Map();
      const now = new Date();
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = formatDate(d);
        map.set(key, { date: key, pv: 0, uv: 0, newUsers: 0, newBlogs: 0, newComments: 0 });
      }
      for (const row of viewTrend) {
        const key = formatDate(row.date);
        if (map.has(key)) Object.assign(map.get(key), { pv: Number(row.pv), uv: Number(row.uv) });
      }
      for (const row of daily) {
        const key = formatDate(row.statDate);
        if (map.has(key)) {
          Object.assign(map.get(key), {
            newUsers: Number(row.newUsers),
            newBlogs: Number(row.newBlogs),
            newComments: Number(row.newComments),
            pv: Number(row.pv) || map.get(key).pv,
            uv: Number(row.uv) || map.get(key).uv,
          });
        }
      }
      return [...map.values()];
    });
  },

  /** 分布类统计：分类占比、评论情感、AI 能力使用 */
  async distribution() {
    return cache.wrap('stats:distribution', 300, async () => {
      const [categories, sentiments, aiActions, hotBlogs] = await Promise.all([
        blogDao.countGroupByCategory(),
        commentDao.countGroupBySentiment(),
        aiLogDao.countGroupByAction(30),
        blogDao.findHot(10),
      ]);
      return {
        categories: categories.map((c) => ({ name: c.name, value: Number(c.value) })),
        sentiments: sentiments.map((s) => ({ name: s.name, value: Number(s.value) })),
        aiActions: aiActions.map((a) => ({ name: a.name, value: Number(a.value) })),
        hotBlogs,
      };
    });
  },

  /** 生成某日统计快照（定时任务调用） */
  async generateDailySnapshot(date = formatDate(new Date(Date.now() - 86400000))) {
    const [pv, uv, newUsers, newBlogs, newComments, aiCalls] = await Promise.all([
      interactionDao.countPvByDate(date),
      interactionDao.countUvByDate(date),
      userDao.countByDate(date),
      blogDao.countByDate(date),
      commentDao.countByDate(date),
      aiLogDao.countByDate(date),
    ]);
    await statsDao.upsertDaily({ statDate: date, pv, uv, newUsers, newBlogs, newComments, aiCalls });
    await cache.delByPattern('stats:*');
    return { date, pv, uv, newUsers, newBlogs, newComments, aiCalls };
  },
};
