/**
 * 轻量日志工具
 * 不引入额外依赖，输出带时间戳与级别的结构化日志
 */
const config = require('../config');

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = config.isProd ? LEVELS.info : LEVELS.debug;

function ts() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function print(level, color, args) {
  if (LEVELS[level] < currentLevel) return;
  const prefix = `${COLORS.gray}[${ts()}]${COLORS.reset} ${color}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
  // eslint-disable-next-line no-console
  console.log(prefix, ...args);
}

module.exports = {
  debug: (...args) => print('debug', COLORS.cyan, args),
  info: (...args) => print('info', COLORS.green, args),
  warn: (...args) => print('warn', COLORS.yellow, args),
  error: (...args) => print('error', COLORS.red, args),
};
