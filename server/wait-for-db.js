/**
 * 等待 MySQL 就绪
 * 容器启动时后端可能比数据库先起来，这里用项目自带的连接池反复探测，
 * 直到连通或超时，避免后端因连不上库直接退出。
 */
const db = require('./src/config/db');

const MAX_RETRIES = 30;
const INTERVAL_MS = 2000;

async function wait() {
  for (let i = 0; i < MAX_RETRIES; i += 1) {
    try {
      await db.testConnection();
      // 释放本次探测建立的连接，交给服务自身的管理池
      await db.closePool();
      console.log('[wait-for-db] MySQL 已就绪');
      return;
    } catch (err) {
      console.log(`[wait-for-db] 等待 MySQL (${i + 1}/${MAX_RETRIES})：${err.message}`);
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }
  console.error('[wait-for-db] 超过最大重试次数仍未连上数据库，退出');
  process.exit(1);
}

wait();
