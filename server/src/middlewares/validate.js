/**
 * Joi 参数校验中间件
 * 用法: router.post('/x', validate({ body: schema, query: schema }), controller)
 */
const { errors } = require('../utils/response');

const OPTIONS = {
  abortEarly: true,     // 遇到第一个错误即返回
  stripUnknown: true,   // 剔除 schema 未声明的字段，防止参数注入
  convert: true,        // 自动类型转换（query 参数均为字符串）
};

/**
 * @param {{body?: import('joi').Schema, query?: import('joi').Schema, params?: import('joi').Schema}} schemas
 */
function validate(schemas = {}) {
  return (req, res, next) => {
    for (const key of ['params', 'query', 'body']) {
      const schema = schemas[key];
      if (!schema) continue;
      const { error, value } = schema.validate(req[key], OPTIONS);
      if (error) {
        const detail = error.details && error.details[0];
        return next(errors.param(detail ? detail.message : '参数校验失败'));
      }
      // Express 5 中 req.query 是 getter，这里用 defineProperty 兼容写回
      if (key === 'query') {
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true });
      } else {
        req[key] = value;
      }
    }
    next();
  };
}

module.exports = { validate };
