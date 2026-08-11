/**
 * 统一响应格式
 * 成功: { code: 0, message: 'success', data: {...} }
 * 失败: { code: <业务码>, message: '错误描述', data: null }
 */

/** 业务错误码字典 */
const CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 40001,      // 参数校验失败
  UNAUTHORIZED: 40101,     // 未登录或 token 失效
  TOKEN_EXPIRED: 40102,    // token 过期
  FORBIDDEN: 40301,        // 无权限
  NOT_FOUND: 40401,        // 资源不存在
  CONFLICT: 40901,         // 资源冲突（如用户名已存在）
  RATE_LIMITED: 42901,     // 请求过于频繁
  CONTENT_VIOLATION: 42201,// 内容违规被拦截
  SERVER_ERROR: 50001,     // 服务器内部错误
  AI_ERROR: 50002,         // AI 服务调用失败
  DB_ERROR: 50003,         // 数据库错误
};

/** 业务异常类，供 service 层主动抛出 */
class BizError extends Error {
  /**
   * @param {string} message 错误提示
   * @param {number} code 业务错误码
   * @param {number} httpStatus HTTP 状态码
   * @param {any} data 附加数据
   */
  constructor(message, code = CODES.SERVER_ERROR, httpStatus = 400, data = null) {
    super(message);
    this.name = 'BizError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

/** 常用异常快捷构造 */
const errors = {
  param: (msg = '参数校验失败', data = null) => new BizError(msg, CODES.PARAM_ERROR, 400, data),
  unauthorized: (msg = '请先登录') => new BizError(msg, CODES.UNAUTHORIZED, 401),
  forbidden: (msg = '没有操作权限') => new BizError(msg, CODES.FORBIDDEN, 403),
  notFound: (msg = '资源不存在') => new BizError(msg, CODES.NOT_FOUND, 404),
  conflict: (msg = '资源已存在') => new BizError(msg, CODES.CONFLICT, 409),
  rateLimited: (msg = '请求过于频繁，请稍后再试') => new BizError(msg, CODES.RATE_LIMITED, 429),
  violation: (msg = '内容包含违规信息', data = null) =>
    new BizError(msg, CODES.CONTENT_VIOLATION, 422, data),
  ai: (msg = 'AI 服务暂时不可用') => new BizError(msg, CODES.AI_ERROR, 500),
  server: (msg = '服务器内部错误') => new BizError(msg, CODES.SERVER_ERROR, 500),
};

/** 成功响应 */
function success(res, data = null, message = 'success') {
  return res.json({ code: CODES.SUCCESS, message, data });
}

/** 分页响应（统一分页结构） */
function page(res, { list, total, pageNum, pageSize }) {
  return res.json({
    code: CODES.SUCCESS,
    message: 'success',
    data: {
      list: list || [],
      pagination: {
        total: Number(total) || 0,
        pageNum: Number(pageNum) || 1,
        pageSize: Number(pageSize) || 10,
        totalPages: Math.ceil((Number(total) || 0) / (Number(pageSize) || 10)),
      },
    },
  });
}

/** 失败响应 */
function fail(res, message = '操作失败', code = CODES.SERVER_ERROR, httpStatus = 400, data = null) {
  return res.status(httpStatus).json({ code, message, data });
}

module.exports = { CODES, BizError, errors, success, page, fail };
