/**
 * AI 配置服务
 * 后台可动态修改 AI 参数，此处做 60 秒本地缓存，避免每次调用都查库
 */
const aiConfigDao = require('../dao/aiConfig.dao');
const logger = require('../utils/logger');

let cacheMap = null;
let cacheTime = 0;
const TTL_MS = 60 * 1000;

/** 加载全部配置到内存 */
async function loadAll(force = false) {
  if (!force && cacheMap && Date.now() - cacheTime < TTL_MS) return cacheMap;
  try {
    const rows = await aiConfigDao.findAll();
    cacheMap = new Map(rows.map((r) => [r.configKey, r]));
    cacheTime = Date.now();
  } catch (err) {
    // 数据库不可用时不阻断，返回空配置让上层走默认值
    logger.warn(`AI 配置加载失败，使用默认值: ${err.message}`);
    if (!cacheMap) cacheMap = new Map();
  }
  return cacheMap;
}

/** 使缓存失效（后台保存配置后调用） */
function invalidate() {
  cacheMap = null;
  cacheTime = 0;
}

async function getRaw(key) {
  const map = await loadAll();
  const item = map.get(key);
  return item ? item.configValue : undefined;
}

async function getString(key, def = '') {
  const val = await getRaw(key);
  return val === undefined || val === '' ? def : String(val);
}

async function getNumber(key, def = 0) {
  const val = await getRaw(key);
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

async function getBoolean(key, def = false) {
  const val = await getRaw(key);
  if (val === undefined) return def;
  return String(val).toLowerCase() === 'true' || val === '1';
}

/** 获取全部配置（后台管理页展示） */
async function list() {
  return aiConfigDao.findAll();
}

/** 批量保存配置 */
async function saveBatch(items) {
  const count = await aiConfigDao.batchUpdate(items);
  invalidate();
  // 通知 AI 入口重建 Provider 实例
  // 这里使用延迟 require，避免与 ai/index.js 形成循环依赖
  // eslint-disable-next-line global-require
  require('../ai').resetProviderCache();
  return count;
}

module.exports = { getString, getNumber, getBoolean, list, saveBatch, invalidate, loadAll };
