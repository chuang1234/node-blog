/**
 * 全局异常处理 & 404 处理
 */
const { BizError, CODES, fail } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

/** 404 兜底 */
function notFoundHandler(req, res) {
  return fail(res, `接口不存在: ${req.method} ${req.originalUrl}`, CODES.NOT_FOUND, 404);
}

/** 统一异常处理（必须放在所有路由之后注册） */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // 1. 业务异常：按约定返回
  if (err instanceof BizError) {
    if (err.httpStatus >= 500) logger.error(`[业务异常] ${err.message}`, err.stack);
    return fail(res, err.message, err.code, err.httpStatus, err.data);
  }

  // 2. Joi 参数校验异常
  if (err.isJoi) {
    const msg = err.details && err.details[0] ? err.details[0].message : '参数校验失败';
    return fail(res, msg, CODES.PARAM_ERROR, 400);
  }

  // 3. multer 上传异常
  if (err.name === 'MulterError') {
    const msgMap = {
      LIMIT_FILE_SIZE: '文件体积超出限制',
      LIMIT_FILE_COUNT: '文件数量超出限制',
      LIMIT_UNEXPECTED_FILE: '非预期的文件字段',
    };
    return fail(res, msgMap[err.code] || `文件上传失败: ${err.code}`, CODES.PARAM_ERROR, 400);
  }

  // 4. MySQL 常见异常映射
  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, '数据已存在，请勿重复提交', CODES.CONFLICT, 409);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.error('[数据库连接异常]', err.message);
    return fail(res, '数据库连接异常，请稍后重试', CODES.DB_ERROR, 503);
  }

  // 5. JSON 解析异常
  if (err.type === 'entity.parse.failed') {
    return fail(res, '请求体格式错误，需为合法 JSON', CODES.PARAM_ERROR, 400);
  }

  // 6. 未知异常
  logger.error(`[未捕获异常] ${req.method} ${req.originalUrl}`, err.stack || err.message);
  return fail(
    res,
    config.isProd ? '服务器内部错误，请稍后重试' : `服务器内部错误: ${err.message}`,
    CODES.SERVER_ERROR,
    500
  );
}

/**
 * 异步控制器包装器
 * 免去在每个 async 控制器中写 try/catch
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFoundHandler, errorHandler, asyncHandler };
