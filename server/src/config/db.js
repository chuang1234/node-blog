/**
 * MySQL 连接池封装
 * 提供 query / queryOne / insert / transaction 等便捷方法
 */
const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');

let pool = null;

/** 创建（或复用）连接池 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      charset: 'utf8mb4_general_ci',
      timezone: '+08:00',
      dateStrings: false,
      // 关闭多语句，降低 SQL 注入风险
      multipleStatements: false,
    });
  }
  return pool;
}

/**
 * 执行 SQL（自动使用预处理语句，防止 SQL 注入）
 * @param {string} sql 带 ? 占位符的 SQL
 * @param {Array} params 参数数组
 */
async function query(sql, params = []) {
  const start = Date.now();
  const [rows] = await getPool().execute(sql, params);
  const cost = Date.now() - start;
  if (cost > 200) logger.warn(`[慢查询 ${cost}ms] ${sql.replace(/\s+/g, ' ').slice(0, 160)}`);
  return rows;
}

/** 查询单条记录，无结果返回 null */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length ? rows[0] : null;
}

/** 执行写操作，返回 { insertId, affectedRows } */
async function execute(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

/**
 * 事务执行
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} handler
 */
async function transaction(handler) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 启动时连通性检测 */
async function testConnection() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
    logger.info(`MySQL 连接成功 → ${config.db.host}:${config.db.port}/${config.db.database}`);
  } finally {
    conn.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, queryOne, execute, transaction, testConnection, closePool };
