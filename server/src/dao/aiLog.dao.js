/**
 * AI 调用日志数据访问层
 */
const db = require('../config/db');

module.exports = {
  create(data) {
    return db.execute(
      `INSERT INTO ai_logs
        (user_id, action, provider, model, prompt_tokens, completion_tokens, duration_ms, status, error_msg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.action,
        data.provider || '',
        data.model || '',
        data.promptTokens || 0,
        data.completionTokens || 0,
        data.durationMs || 0,
        data.status || 'success',
        data.errorMsg || '',
      ]
    );
  },

  async findPage({ action, status, userId, offset = 0, pageSize = 20 }) {
    const where = ['1=1'];
    const params = [];
    if (action) {
      where.push('l.action = ?');
      params.push(action);
    }
    if (status) {
      where.push('l.status = ?');
      params.push(status);
    }
    if (userId) {
      where.push('l.user_id = ?');
      params.push(userId);
    }
    const whereSql = where.join(' AND ');

    const list = await db.query(
      `SELECT l.id, l.user_id AS userId, l.action, l.provider, l.model,
              l.prompt_tokens AS promptTokens, l.completion_tokens AS completionTokens,
              l.duration_ms AS durationMs, l.status, l.error_msg AS errorMsg,
              l.created_at AS createdAt, u.nickname AS userName
       FROM ai_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${whereSql} ORDER BY l.created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    );
    const countRow = await db.queryOne(`SELECT COUNT(*) AS total FROM ai_logs l WHERE ${whereSql}`, params);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 按能力维度统计调用量 */
  countGroupByAction(days = 30) {
    return db.query(
      `SELECT action AS name, COUNT(*) AS value
       FROM ai_logs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY action ORDER BY value DESC`,
      [days]
    );
  },

  async countByDate(date) {
    const row = await db.queryOne('SELECT COUNT(*) AS total FROM ai_logs WHERE DATE(created_at) = ?', [date]);
    return row ? row.total : 0;
  },

  async summary(days = 30) {
    return db.queryOne(
      `SELECT COUNT(*) AS totalCalls,
              COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS totalTokens,
              COALESCE(AVG(duration_ms), 0) AS avgDuration,
              COALESCE(SUM(status = 'failed'), 0) AS failedCount
       FROM ai_logs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [days]
    );
  },
};
