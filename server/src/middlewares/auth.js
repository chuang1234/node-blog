/**
 * 鉴权中间件
 * - auth()        : 强制登录
 * - optionalAuth(): 可选登录（游客也能访问，但登录后可获得个性化数据）
 * - requireAdmin(): 管理员权限
 */
const jwtUtil = require('../utils/jwt');
const { errors } = require('../utils/response');
const userDao = require('../dao/user.dao');
const cache = require('../config/redis');

/** 从缓存或数据库加载用户信息（缓存 5 分钟，减少 DB 压力） */
async function loadUser(userId) {
  return cache.wrap(`user:info:${userId}`, 300, async () => {
    const user = await userDao.findById(userId);
    if (!user) return null;
    // 不缓存密码字段
    delete user.password;
    return user;
  });
}

/** 强制登录 */
function auth() {
  return async (req, res, next) => {
    try {
      const token = jwtUtil.extractToken(req);
      if (!token) throw errors.unauthorized();

      const result = jwtUtil.verify(token);
      if (!result.ok) throw errors.unauthorized(result.message);

      const user = await loadUser(result.payload.id);
      if (!user) throw errors.unauthorized('用户不存在');
      if (user.status !== 1) throw errors.forbidden('账号已被禁用，请联系管理员');

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** 可选登录：解析失败也放行，仅不注入 req.user */
function optionalAuth() {
  return async (req, res, next) => {
    try {
      const token = jwtUtil.extractToken(req);
      if (token) {
        const result = jwtUtil.verify(token);
        if (result.ok) {
          const user = await loadUser(result.payload.id);
          if (user && user.status === 1) req.user = user;
        }
      }
    } catch (err) {
      // 可选鉴权失败不阻断请求
    }
    next();
  };
}

/** 管理员权限校验（需配合 auth() 使用） */
function requireAdmin() {
  return (req, res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role !== 'admin') return next(errors.forbidden('该操作需要管理员权限'));
    next();
  };
}

module.exports = { auth, optionalAuth, requireAdmin, loadUser };
