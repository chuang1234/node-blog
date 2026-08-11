/**
 * 应用「文章/评论 AI 审核拆分为两个独立开关」迁移
 * 读取 server/.env，连接 MySQL，执行 migrate_2026-08-11_moderation_split.sql
 * 幂等：INSERT IGNORE，已存在则跳过
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SERVER_DIR = __dirname.replace(/\\/g, '/').replace(/\/scripts$/, '');
const ENV_PATH = path.join(SERVER_DIR, '.env');
const SQL_PATH = path.join(SERVER_DIR, 'sql', 'migrate_2026-08-11_moderation_split.sql');

function loadEnv(file) {
  const map = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function splitStatements(sql) {
  // 简单按分号切分（迁移文件不含存储过程/字符串内分号）
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const statements = splitStatements(sql);

  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'ai_blog',
    charset: 'utf8mb4_general_ci',
  });

  let inserted = 0;
  for (const stmt of statements) {
    const [res] = await conn.query(stmt);
    if (res && typeof res.affectedRows === 'number' && stmt.toUpperCase().includes('INSERT')) {
      inserted += res.affectedRows;
    }
  }

  const [rows] = await conn.query(
    "SELECT config_key, config_value, value_type, description FROM ai_configs WHERE config_key IN ('ai.auto_moderate','ai.auto_moderate_blog','ai.auto_moderate_comment') ORDER BY id ASC"
  );

  console.log(`\n迁移执行完成，本次新增行数: ${inserted}`);
  console.log('当前审核相关开关:');
  for (const r of rows) {
    console.log(`  - ${r.config_key} = ${r.config_value}  [${r.value_type}]  ${r.description}`);
  }

  await conn.end();
}

main().catch((err) => {
  console.error('迁移失败:', err.message);
  process.exitCode = 1;
});
