/**
 * 通用工具函数
 */
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');

/** 密码加密 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/** 密码校验 */
async function comparePassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * XSS 清洗：用于用户提交的富文本/评论内容
 * 保留常见排版标签，剔除 script、on* 事件、javascript: 协议
 */
function cleanHtml(html) {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'figure', 'figcaption', 'del', 'ins', 'span',
    ]),
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      span: ['style'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

/** 纯文本清洗：彻底剥离标签，用于评论、标题等 */
function stripTags(text) {
  if (!text) return '';
  return sanitizeHtml(String(text), { allowedTags: [], allowedAttributes: {} }).trim();
}

/** Markdown 转纯文本（用于摘要生成、字数统计） */
function markdownToText(md) {
  if (!md) return '';
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')       // 代码块
    .replace(/`[^`]*`/g, ' ')              // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^#{1,6}\s+/gm, '')           // 标题符号
    .replace(/^\s{0,3}>\s?/gm, '')         // 引用
    .replace(/[*_~]{1,3}/g, '')            // 强调符号
    .replace(/^\s*[-*+]\s+/gm, '')         // 无序列表
    .replace(/^\s*\d+\.\s+/gm, '')         // 有序列表
    .replace(/\|/g, ' ')                   // 表格
    .replace(/\s+/g, ' ')
    .trim();
}

/** 统计字数：中文按字符计，英文按单词计 */
function countWords(text) {
  const plain = markdownToText(text);
  const cn = (plain.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (plain.match(/[a-zA-Z]+/g) || []).length;
  return cn + en;
}

/** 从内容中截取纯文本摘要 */
function truncateText(text, len = 120) {
  const plain = markdownToText(text);
  return plain.length > len ? `${plain.slice(0, len)}...` : plain;
}

/** 分页参数归一化 */
function normalizePage(query = {}) {
  const pageNum = Math.max(1, parseInt(query.pageNum, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  return { pageNum, pageSize, offset: (pageNum - 1) * pageSize };
}

/** 生成对象的稳定缓存 key（用于列表缓存） */
function cacheKeyOf(prefix, obj = {}) {
  const parts = Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .map((k) => `${k}=${obj[k]}`);
  return `${prefix}:${parts.join('&') || 'all'}`;
}

/** 安全地将逗号分隔字符串转数组 */
function splitList(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str.filter(Boolean);
  return String(str)
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 睡眠（用于重试退避） */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 格式化日期为 YYYY-MM-DD */
function formatDate(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

module.exports = {
  hashPassword,
  comparePassword,
  cleanHtml,
  stripTags,
  markdownToText,
  countWords,
  truncateText,
  normalizePage,
  cacheKeyOf,
  splitList,
  sleep,
  formatDate,
};
