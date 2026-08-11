/**
 * AI 配置数据访问层
 */
const db = require('../config/db');

module.exports = {
  findAll() {
    return db.query(
      `SELECT id, config_key AS configKey, config_value AS configValue,
              value_type AS valueType, description, updated_at AS updatedAt
       FROM ai_configs ORDER BY id ASC`
    );
  },

  findByKey(key) {
    return db.queryOne(
      `SELECT config_key AS configKey, config_value AS configValue, value_type AS valueType
       FROM ai_configs WHERE config_key = ?`,
      [key]
    );
  },

  async upsert(key, value, valueType = 'string', description = '') {
    const result = await db.execute(
      `INSERT INTO ai_configs (config_key, config_value, value_type, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, String(value), valueType, description]
    );
    return result.affectedRows;
  },

  /** 批量更新 */
  async batchUpdate(items = []) {
    let count = 0;
    for (const item of items) {
      if (!item || !item.configKey) continue;
      await db.execute('UPDATE ai_configs SET config_value = ? WHERE config_key = ?', [
        String(item.configValue),
        item.configKey,
      ]);
      count += 1;
    }
    return count;
  },
};
