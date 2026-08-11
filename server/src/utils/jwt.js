/**
 * JWT 工具
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/** 签发访问令牌 */
function sign(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/** 签发刷新令牌 */
function signRefresh(payload) {
  return jwt.sign({ ...payload, typ: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * 校验令牌
 * @returns {{ok: true, payload: object} | {ok: false, expired: boolean, message: string}}
 */
function verify(token) {
  try {
    return { ok: true, payload: jwt.verify(token, config.jwt.secret) };
  } catch (err) {
    return {
      ok: false,
      expired: err.name === 'TokenExpiredError',
      message: err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '身份凭证无效',
    };
  }
}

/** 从请求头中提取 Bearer Token */
function extractToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  // 兼容前端直接传 token 字段
  if (req.headers.token) return String(req.headers.token);
  return null;
}

module.exports = { sign, signRefresh, verify, extractToken };
