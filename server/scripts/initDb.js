/**
 * 数据库一键初始化脚本
 *
 * 用法:
 *   npm run db:init            # 建库建表 + 导入种子数据 + 回写密码哈希
 *   npm run db:init -- --force # 先 DROP DATABASE 再重建（危险，会清空数据）
 *   npm run db:init -- --no-seed  # 只建表，不导入示例数据
 *
 * 说明:
 *   seed.sql 中的 password 字段是占位 hash，
 *   本脚本会在导入完成后用 bcryptjs 现场计算真实哈希并回写，
 *   保证默认账号 admin/admin123、demo/demo123 可以直接登录。
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 复用项目配置（会自动加载 .env）
const config = require('../src/config');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const NO_SEED = args.includes('--no-seed');

/** 默认账号（与 seed.sql 中的注释保持一致） */
const DEFAULT_ACCOUNTS = [
  { username: 'admin', password: 'admin123' },
  { username: 'demo', password: 'demo123' },
];

/** 彩色输出 */
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};
const log = {
  step: (msg) => console.log(`${c.cyan}▶${c.reset} ${msg}`),
  ok: (msg) => console.log(`${c.green}✓${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}!${c.reset} ${msg}`),
  err: (msg) => console.log(`${c.red}✗${c.reset} ${msg}`),
  dim: (msg) => console.log(`${c.gray}  ${msg}${c.reset}`),
};

/**
 * 将 SQL 文件切分为可逐条执行的语句
 * 处理要点：
 * - 去掉 -- 行注释（但保留字符串内部的 --）
 * - 去掉 /* *\/ 块注释
 * - 以分号切分，并跳过空语句
 */
function splitSqlStatements(sql) {
  // 移除块注释
  let text = sql.replace(/\/\*[\s\S]*?\*\//g, '');

  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    // 行注释处理
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        current += ch;
      }
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick) {
      // -- 注释（要求后面跟空白字符，避免误伤 a--b 这类表达式）
      if (ch === '-' && next === '-' && /\s/.test(text[i + 2] || ' ')) {
        inLineComment = true;
        i += 1;
        continue;
      }
      // # 注释
      if (ch === '#') {
        inLineComment = true;
        continue;
      }
    }

    // 引号状态切换（处理转义）
    if (ch === "'" && !inDouble && !inBacktick && text[i - 1] !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inBacktick && text[i - 1] !== '\\') inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;

    // 语句结束
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/** 执行一个 SQL 文件 */
async function runSqlFile(conn, filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL 文件不存在: ${filePath}`);
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitSqlStatements(sql);

  log.step(`执行 ${label} (${statements.length} 条语句)`);
  let executed = 0;
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      executed += 1;
    } catch (err) {
      // 重复执行时的幂等性错误可以忽略
      const ignorable = [
        'ER_DB_CREATE_EXISTS',
        'ER_TABLE_EXISTS_ERROR',
        'ER_DUP_KEYNAME',
        'ER_DUP_ENTRY',
        'ER_DUP_FIELDNAME',
      ];
      if (ignorable.includes(err.code)) {
        log.dim(`跳过(已存在): ${err.code}`);
        continue;
      }
      log.err(`语句执行失败: ${stmt.replace(/\s+/g, ' ').slice(0, 120)}...`);
      throw err;
    }
  }
  log.ok(`${label} 执行完成，成功 ${executed} 条`);
}

/** 用 bcrypt 回写默认账号密码 */
async function resetDefaultPasswords(conn) {
  log.step('回写默认账号密码哈希 (bcryptjs)');
  for (const acc of DEFAULT_ACCOUNTS) {
    const hash = await bcrypt.hash(acc.password, 10);
    const [result] = await conn.query('UPDATE `users` SET `password` = ? WHERE `username` = ?', [
      hash,
      acc.username,
    ]);
    if (result.affectedRows > 0) {
      log.ok(`${acc.username.padEnd(6)} → 密码已设置为 ${c.yellow}${acc.password}${c.reset}`);
    } else {
      log.warn(`未找到用户 ${acc.username}，跳过`);
    }
  }
}

/** 校验初始化结果 */
async function verify(conn) {
  log.step('校验初始化结果');
  const [tables] = await conn.query(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [config.db.database]
  );
  log.ok(`共创建 ${tables.length} 张表: ${tables.map((t) => t.name).join(', ')}`);

  const counts = {};
  for (const t of ['users', 'categories', 'tags', 'blogs', 'comments', 'ai_configs', 'sensitive_words']) {
    if (!tables.find((x) => x.name === t)) continue;
    const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    counts[t] = rows[0].n;
  }
  log.ok(`数据统计: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  // 验证密码可用性
  const [users] = await conn.query('SELECT username, password FROM `users` WHERE username = ?', ['admin']);
  if (users.length) {
    const valid = await bcrypt.compare('admin123', users[0].password);
    if (valid) log.ok('默认管理员密码校验通过 (admin / admin123)');
    else log.err('默认管理员密码校验失败，请手动执行 node scripts/resetPassword.js admin admin123');
  }
}

async function main() {
  console.log('');
  console.log(`${c.cyan}══════ AI Agent 博客系统 · 数据库初始化 ══════${c.reset}`);
  console.log(`  目标: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
  console.log(`  模式: ${FORCE ? '强制重建(--force)' : '增量初始化'}${NO_SEED ? ' + 跳过种子数据' : ''}`);
  console.log('');

  let conn = null;
  try {
    // 先连接到 MySQL 实例（不指定 database，因为库可能还不存在）
    conn = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      multipleStatements: false,
      charset: 'utf8mb4_general_ci',
    });
    log.ok('MySQL 连接成功');

    if (FORCE) {
      log.warn(`即将删除数据库 ${config.db.database}，所有数据将丢失！`);
      await conn.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
      log.ok(`数据库 ${config.db.database} 已删除`);
    }

    // init.sql 内部已包含 CREATE DATABASE 与 USE 语句
    await runSqlFile(conn, path.resolve(__dirname, '../sql/init.sql'), 'init.sql (建库建表)');

    // 切换到目标库，保证后续语句作用在正确的库上
    await conn.query(`USE \`${config.db.database}\``);

    if (!NO_SEED) {
      await runSqlFile(conn, path.resolve(__dirname, '../sql/seed.sql'), 'seed.sql (种子数据)');
      await resetDefaultPasswords(conn);
    } else {
      log.warn('已跳过种子数据导入 (--no-seed)');
    }

    await verify(conn);

    console.log('');
    log.ok(`${c.green}数据库初始化完成！${c.reset}`);
    console.log('');
    console.log(`  下一步: ${c.cyan}npm run dev${c.reset}  启动后端服务`);
    console.log(`  默认账号: ${c.yellow}admin / admin123${c.reset} (管理员)   ${c.yellow}demo / demo123${c.reset} (普通用户)`);
    console.log('');
  } catch (err) {
    console.log('');
    log.err(`初始化失败: ${err.message}`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      log.dim('请检查 .env 中的 DB_USER / DB_PASSWORD 是否正确');
    } else if (err.code === 'ECONNREFUSED') {
      log.dim(`无法连接 ${config.db.host}:${config.db.port}，请确认 MySQL 服务已启动`);
    }
    console.log('');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
