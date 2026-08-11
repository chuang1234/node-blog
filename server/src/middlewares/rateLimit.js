/**
 * 限流中间件（基于 Redis 计数器，Redis 不可用时自动走内存计数）
 * - apiRateLimit : 通用接口限流，按 IP 维度
 * - aiRateLimit  : AI 接口限流，按用户维度，分钟级 + 天级双重控制
 */
const cache = require('../config/redis');
const config = require('../config');
const { errors } = require('../utils/response');
const aiConfigService = require('../services/aiConfig.service');

/** 获取客户端真实 IP */
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/** 通用接口限流：按 IP + 分钟窗口 */
function apiRateLimit(limitPerMin = config.apiRateLimitPerMin) {
  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      const minute = Math.floor(Date.now() / 60000);
      const count = await cache.incrWithExpire(`rl:api:${ip}:${minute}`, 70);
      res.set('X-RateLimit-Limit', String(limitPerMin));
      res.set('X-RateLimit-Remaining', String(Math.max(0, limitPerMin - count)));
      if (count > limitPerMin) {
        throw errors.rateLimited('请求过于频繁，请稍后再试');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * AI 接口限流：按用户维度
 * 限额优先取后台 ai_configs 中的动态配置，回退到环境变量
 */
function aiRateLimit() {
  return async (req, res, next) => {
    try {
      const userId = req.user ? req.user.id : `ip:${getClientIp(req)}`;

      const perMin = await aiConfigService.getNumber('ai.rate_limit_per_min', config.ai.rateLimitPerMin);
      const perDay = await aiConfigService.getNumber('ai.rate_limit_per_day', config.ai.rateLimitPerDay);

      const minute = Math.floor(Date.now() / 60000);
      const day = new Date().toISOString().slice(0, 10);

      const minCount = await cache.incrWithExpire(`rl:ai:min:${userId}:${minute}`, 70);
      if (minCount > perMin) {
        throw errors.rateLimited(`AI 调用过于频繁，每分钟最多 ${perMin} 次，请稍后再试`);
      }

      const dayCount = await cache.incrWithExpire(`rl:ai:day:${userId}:${day}`, 86400);
      if (dayCount > perDay) {
        throw errors.rateLimited(`今日 AI 调用次数已达上限（${perDay} 次），请明天再来`);
      }

      res.set('X-AI-Quota-Day', String(Math.max(0, perDay - dayCount)));
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { apiRateLimit, aiRateLimit, getClientIp };
