/**
 * 服务启动入口
 *
 * 启动流程：
 * 1. 检测 MySQL 连通性（失败则直接退出，避免带病启动）
 * 2. 初始化缓存（Redis 不可用时自动降级为内存缓存，不阻断启动）
 * 3. 预加载 AI 配置
 * 4. 启动定时任务
 * 5. 监听端口
 * 6. 注册优雅关闭与全局异常兜底
 */
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./config/db');
const cache = require('./config/redis');
const aiConfigService = require('./services/aiConfig.service');
const { startJobs, stopJobs } = require('./jobs');

let server = null;
let shuttingDown = false;

/** 打印启动横幅 */
function printBanner() {
  const provider = config.ai.provider;
  const offline = provider === 'mock';
  const lines = [
    '',
    '  ╔══════════════════════════════════════════════════════╗',
    '  ║        AI Agent 博客系统 · 后端服务已启动            ║',
    '  ╚══════════════════════════════════════════════════════╝',
    `  · 运行环境   : ${config.env}`,
    `  · 服务地址   : http://localhost:${config.port}`,
    `  · 接口文档   : http://localhost:${config.port}/api-docs`,
    `  · 健康检查   : http://localhost:${config.port}/api/health`,
    `  · 数据库     : ${config.db.host}:${config.db.port}/${config.db.database}`,
    `  · 缓存模式   : ${cache.isMemoryMode() ? '进程内存(降级)' : 'Redis'}`,
    `  · AI Provider: ${provider}${offline ? '  (离线规则引擎，无需 API Key)' : ''}`,
    '',
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

async function bootstrap() {
  // 1. 数据库连通性检测
  try {
    await db.testConnection();
  } catch (err) {
    logger.error(`MySQL 连接失败: ${err.message}`);
    logger.error('请检查 .env 中的数据库配置，并确认已执行 npm run db:init 初始化库表');
    process.exit(1);
  }

  // 2. 缓存初始化（内部已做降级处理，不会抛出）
  await cache.initCache();

  // 3. 预加载 AI 配置到内存，避免首个请求时的冷启动延迟
  try {
    await aiConfigService.loadAll(true);
    logger.info('AI 配置加载完成');
  } catch (err) {
    logger.warn(`AI 配置预加载失败，将使用默认值: ${err.message}`);
  }

  // 4. 定时任务
  startJobs();

  // 5. 监听端口
  server = app.listen(config.port, () => {
    printBanner();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`端口 ${config.port} 已被占用，请修改 .env 中的 PORT 或结束占用进程`);
    } else {
      logger.error(`服务启动失败: ${err.message}`);
    }
    process.exit(1);
  });
}

/**
 * 优雅关闭
 * 停止接收新请求 → 取消定时任务 → 关闭缓存与数据库连接
 */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn(`收到 ${signal} 信号，开始优雅关闭...`);

  // 超时兜底：10 秒内未完成则强制退出
  const forceTimer = setTimeout(() => {
    logger.error('优雅关闭超时，强制退出');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('HTTP 服务已停止接收新请求');
    }
    await stopJobs();
    logger.info('定时任务已取消');
    await cache.closeCache();
    await db.closePool();
    logger.info('数据库与缓存连接已释放');
  } catch (err) {
    logger.error(`关闭过程中出现异常: ${err.message}`);
  } finally {
    clearTimeout(forceTimer);
    process.exit(0);
  }
}

// 6. 进程信号与全局异常兜底
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('[未处理的 Promise 拒绝]', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  logger.error('[未捕获的异常]', err.stack || err.message);
  // 未捕获异常后进程状态不可信，优雅关闭后退出
  shutdown('uncaughtException');
});

bootstrap();
