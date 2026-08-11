/**
 * 缓存层
 * 优先使用 Redis；当 Redis 未启用或连接失败时，自动降级为进程内存缓存，
 * 保证在没有 Redis 的开发机上系统依然可以完整运行。
 */
const redis = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

let client = null;
let usingMemory = false;

/** 进程内存缓存（降级方案） */
const memoryStore = new Map();

function memGet(key) {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expireAt && item.expireAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

function memSet(key, value, ttlSec) {
  memoryStore.set(key, {
    value,
    expireAt: ttlSec ? Date.now() + ttlSec * 1000 : 0,
  });
}

// 定期清理内存缓存中的过期项，避免无限增长
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expireAt && v.expireAt < now) memoryStore.delete(k);
  }
}, 60 * 1000).unref();

/** 初始化缓存客户端 */
async function initCache() {
  if (!config.redis.enabled) {
    usingMemory = true;
    logger.warn('Redis 已在配置中禁用，使用进程内存缓存降级方案');
    return;
  }
  try {
    client = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 3000,
        reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 1000)),
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });
    client.on('error', (err) => {
      if (!usingMemory) logger.warn(`Redis 异常: ${err.message}`);
    });
    await client.connect();
    await client.ping();
    logger.info(`Redis 连接成功 → ${config.redis.host}:${config.redis.port}`);
  } catch (err) {
    usingMemory = true;
    client = null;
    logger.warn(`Redis 连接失败(${err.message})，自动降级为进程内存缓存`);
  }
}

const withPrefix = (key) => `${config.redis.prefix}${key}`;

/** 读取缓存（自动 JSON 反序列化） */
async function get(key) {
  const k = withPrefix(key);
  try {
    if (client && client.isOpen) {
      const val = await client.get(k);
      return val ? JSON.parse(val) : null;
    }
  } catch (err) {
    logger.warn(`缓存读取失败: ${err.message}`);
  }
  return memGet(k);
}

/** 写入缓存（自动 JSON 序列化），ttlSec 为过期秒数 */
async function set(key, value, ttlSec = 300) {
  const k = withPrefix(key);
  try {
    if (client && client.isOpen) {
      await client.set(k, JSON.stringify(value), ttlSec ? { EX: ttlSec } : undefined);
      return true;
    }
  } catch (err) {
    logger.warn(`缓存写入失败: ${err.message}`);
  }
  memSet(k, value, ttlSec);
  return true;
}

/** 删除缓存 */
async function del(key) {
  const k = withPrefix(key);
  try {
    if (client && client.isOpen) {
      await client.del(k);
      return true;
    }
  } catch (err) {
    logger.warn(`缓存删除失败: ${err.message}`);
  }
  memoryStore.delete(k);
  return true;
}

/** 按通配符批量删除（用于列表缓存失效） */
async function delByPattern(pattern) {
  const p = withPrefix(pattern);
  try {
    if (client && client.isOpen) {
      const keys = await client.keys(p);
      if (keys.length) await client.del(keys);
      return keys.length;
    }
  } catch (err) {
    logger.warn(`缓存批量删除失败: ${err.message}`);
  }
  const reg = new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  let count = 0;
  for (const k of memoryStore.keys()) {
    if (reg.test(k)) {
      memoryStore.delete(k);
      count += 1;
    }
  }
  return count;
}

/**
 * 计数器自增并设置过期（用于限流）
 * @returns {Promise<number>} 自增后的值
 */
async function incrWithExpire(key, ttlSec) {
  const k = withPrefix(key);
  try {
    if (client && client.isOpen) {
      const val = await client.incr(k);
      if (val === 1) await client.expire(k, ttlSec);
      return val;
    }
  } catch (err) {
    logger.warn(`限流计数失败: ${err.message}`);
  }
  const cur = memGet(k) || 0;
  const next = cur + 1;
  const item = memoryStore.get(k);
  memSet(k, next, item && item.expireAt ? Math.ceil((item.expireAt - Date.now()) / 1000) : ttlSec);
  return next;
}

/**
 * 缓存包装器：命中直接返回，未命中执行 loader 并写入缓存
 */
async function wrap(key, ttlSec, loader) {
  const cached = await get(key);
  if (cached !== null && cached !== undefined) return cached;
  const data = await loader();
  if (data !== null && data !== undefined) await set(key, data, ttlSec);
  return data;
}

async function closeCache() {
  if (client && client.isOpen) await client.quit();
  client = null;
}

module.exports = {
  initCache,
  get,
  set,
  del,
  delByPattern,
  incrWithExpire,
  wrap,
  closeCache,
  isMemoryMode: () => usingMemory,
};
