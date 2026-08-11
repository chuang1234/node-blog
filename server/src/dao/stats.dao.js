/**
 * 统计数据访问层
 */
const db = require('../config/db');

module.exports = {
  /** 写入/更新某日统计 */
  upsertDaily(data) {
    return db.execute(
      `INSERT INTO stats_daily (stat_date, pv, uv, new_users, new_blogs, new_comments, ai_calls)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         pv = VALUES(pv), uv = VALUES(uv), new_users = VALUES(new_users),
         new_blogs = VALUES(new_blogs), new_comments = VALUES(new_comments), ai_calls = VALUES(ai_calls)`,
      [
        data.statDate,
        data.pv || 0,
        data.uv || 0,
        data.newUsers || 0,
        data.newBlogs || 0,
        data.newComments || 0,
        data.aiCalls || 0,
      ]
    );
  },

  /** 近 N 天统计 */
  findRecent(days = 7) {
    return db.query(
      `SELECT stat_date AS statDate, pv, uv, new_users AS newUsers,
              new_blogs AS newBlogs, new_comments AS newComments, ai_calls AS aiCalls
       FROM stats_daily
       WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY stat_date ASC`,
      [days]
    );
  },
};
