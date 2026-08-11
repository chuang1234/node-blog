/**
 * 通用格式化与工具函数
 */
import dayjs from 'dayjs';

/** 标准日期时间 */
export function formatDate(iso?: string | null, fmt = 'YYYY-MM-DD HH:mm'): string {
  if (!iso) return '-';
  return dayjs(iso).format(fmt);
}

/** 数字简写：1234 -> 1.2k */
export function formatCount(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}w`;
}

/** 根据字数估算阅读时长（分钟），按 300 字/分钟 */
export function readMinutes(wordCount = 0): number {
  return Math.max(1, Math.ceil(wordCount / 300));
}

/**
 * 处理封面/头像地址
 * - 已是完整 http(s) 链接则原样返回
 * - 后端返回的相对路径（如 /uploads/...）原样返回（开发与生产均同源）
 */
export function getImageUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
}

/** 默认头像 */
export const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="40" fill="#1677ff"/>
  <text x="50%" y="54%" font-size="34" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">AI</text>
</svg>`);

/** 文章封面占位图 */
export const DEFAULT_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="#eef2f7"/>
      <text x="50%" y="54%" font-size="16" fill="#9aa7b8" text-anchor="middle" font-family="sans-serif">AI Blog</text>
    </svg>`
  );

/** 拼接页面标题 */
export function pageTitle(sub?: string): string {
  const base = import.meta.env.VITE_APP_TITLE || 'AI Agent 博客';
  return sub ? `${sub} · ${base}` : base;
}

/** 将字符串里的换行转换为 HTML（仅用于受信任的内部内容，如 AI 结果展示） */
export function nl2br(text: string): string {
  return text.replace(/\n/g, '<br/>');
}
