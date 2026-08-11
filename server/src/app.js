/**
 * Express 应用装配
 *
 * 中间件注册顺序（顺序不可随意调整）：
 * 1. 安全响应头 helmet
 * 2. CORS 跨域
 * 3. 响应压缩
 * 4. 请求体解析
 * 5. 请求日志
 * 6. 静态资源（上传文件）
 * 7. 全局限流
 * 8. 业务路由
 * 9. Swagger 文档
 * 10. 404 兜底
 * 11. 全局异常处理（必须最后注册）
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const { notFoundHandler, errorHandler } = require('./middlewares/error');
const { apiRateLimit } = require('./middlewares/rateLimit');

const app = express();

// 部署在 Nginx 等反向代理之后时，信任代理以获取真实 IP
app.set('trust proxy', 1);
// 关闭 X-Powered-By，避免暴露技术栈
app.disable('x-powered-by');

// ---------------- 1. 安全响应头 ----------------
app.use(
  helmet({
    // 允许前端跨域加载上传的图片资源
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // 本项目前后端分离，后端不返回 HTML 页面，关闭 CSP 以免影响 Swagger UI
    contentSecurityPolicy: false,
  })
);

// ---------------- 2. CORS 跨域 ----------------
app.use(
  cors({
    origin(origin, callback) {
      // 无 origin 的请求（curl、服务端调用、同源请求）直接放行
      if (!origin) return callback(null, true);
      if (config.corsOrigin.includes(origin) || config.corsOrigin.includes('*')) {
        return callback(null, true);
      }
      // 开发环境放宽限制，便于局域网调试
      if (!config.isProd) return callback(null, true);
      return callback(new Error(`CORS 未允许的来源: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-AI-Quota-Day'],
  })
);

// ---------------- 3. 响应压缩 ----------------
app.use(compression());

// ---------------- 4. 请求体解析 ----------------
// 博客正文可能较长，放宽到 2MB
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------------- 5. 请求日志 ----------------
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const cost = Date.now() - start;
    // 静态资源与健康检查不记录，避免刷屏
    if (req.originalUrl.startsWith(`/${config.upload.dir}`) || req.originalUrl === '/api/health') {
      return;
    }
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${cost}ms`);
  });
  next();
});

// ---------------- 6. 静态资源 ----------------
// 上传的头像、封面通过 /uploads/** 直接访问
app.use(
  `/${config.upload.dir}`,
  express.static(path.resolve(__dirname, '../', config.upload.dir), {
    maxAge: config.isProd ? '7d' : 0,
    // 禁止列目录
    index: false,
    // 上传目录不应包含可执行内容，统一按附件处理未知类型
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    },
  })
);

// ---------------- 7. 全局限流 ----------------
app.use('/api', apiRateLimit());

// ---------------- 8. 业务路由 ----------------
app.use('/api', routes);

// ---------------- 9. 接口文档 ----------------
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AI Agent 博客系统 API 文档',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
  })
);
// 提供原始 OpenAPI JSON，方便导入 Apifox / Postman
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// 根路径给出简单指引
app.get('/', (req, res) =>
  res.json({
    name: 'AI Agent 博客系统 API',
    version: '1.0.0',
    docs: '/api-docs',
    health: '/api/health',
  })
);

// ---------------- 10. 404 ----------------
app.use(notFoundHandler);

// ---------------- 11. 全局异常处理 ----------------
app.use(errorHandler);

module.exports = app;
