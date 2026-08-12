/**
 * 全局配置中心
 * 统一读取环境变量并提供带默认值的强类型配置对象
 */
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env（若不存在则回退到 .env.example，保证开箱即用）
const envPath = path.resolve(__dirname, '../../.env');
const fs = require('fs');
dotenv.config({ path: fs.existsSync(envPath) ? envPath : path.resolve(__dirname, '../../.env.example') });

/** 读取布尔型环境变量 */
const bool = (val, def = false) => {
  if (val === undefined || val === '') return def;
  return String(val).toLowerCase() === 'true';
};

/** 读取数字型环境变量 */
const num = (val, def = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 3000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // 用 !== undefined 区分「未设置」与「显式留空」：
  // Docker 部署时 STATIC_BASE_URL 设为空字符串 -> 走相对路径 /uploads/...（由 nginx 反代）；
  // 本地开发不设置该变量 -> 默认 http://localhost:3000（与本地 server 同域）。
  staticBaseUrl:
    process.env.STATIC_BASE_URL !== undefined
      ? process.env.STATIC_BASE_URL
      : 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Chuang@123456',
    database: process.env.DB_NAME || 'ai_blog',
    connectionLimit: num(process.env.DB_CONNECTION_LIMIT, 10),
  },

  redis: {
    enabled: bool(process.env.REDIS_ENABLED, true),
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: num(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: num(process.env.REDIS_DB, 0),
    prefix: process.env.REDIS_PREFIX || 'ai_blog:',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMB: num(process.env.UPLOAD_MAX_SIZE_MB, 5),
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 60000),
    rateLimitPerMin: num(process.env.AI_RATE_LIMIT_PER_MIN, 10),
    rateLimitPerDay: num(process.env.AI_RATE_LIMIT_PER_DAY, 200),
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.QWEN_MODEL || 'qwen-plus',
    },
    ernie: {
      apiKey: process.env.ERNIE_API_KEY || '',
      baseUrl: process.env.ERNIE_BASE_URL || 'https://qianfan.baidubce.com/v2',
      model: process.env.ERNIE_MODEL || 'ernie-4.0-8k',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    },
  },

  apiRateLimitPerMin: num(process.env.API_RATE_LIMIT_PER_MIN, 300),
};

module.exports = config;
