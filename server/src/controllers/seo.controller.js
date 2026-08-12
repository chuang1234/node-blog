/**
 * SEO 端点：站点地图 / RSS 订阅 / robots
 * 均为纯公开、无鉴权接口，部署在站点根路径（/sitemap.xml、/rss.xml、/robots.txt）
 */
const blogDao = require('../dao/blog.dao');
const categoryDao = require('../dao/category.dao');
const tagDao = require('../dao/tag.dao');
const config = require('../config');
const { stripTags, truncateText, markdownToText } = require('../utils/helper');

/** XML 特殊字符转义 */
function xmlEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 推导站点根地址：优先用显式配置的 SITE_URL，否则从请求 Host 推导 */
function siteUrlOf(req) {
  if (config.siteUrl) return config.siteUrl.replace(/\/+$/, '');
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${req.get('host')}`;
}

/** 转 W3C 日期（sitemap lastmod） */
function toW3CDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toISOString();
}

/** 转 RFC 822 日期（RSS pubDate） */
function toRfc822(date) {
  const d = date ? new Date(date) : new Date();
  return d.toUTCString();
}

module.exports = {
  /** 站点地图 */
  async sitemap(req, res) {
    const base = siteUrlOf(req);
    const [blogs, categories, tags] = await Promise.all([
      blogDao.findForSitemap(),
      categoryDao.findAll(),
      tagDao.findAll(),
    ]);

    const urls = [];
    urls.push(
      `  <url><loc>${xmlEscape(`${base}/`)}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
    );

    for (const c of categories) {
      if (!c.slug || (c.blogCount || 0) <= 0) continue;
      urls.push(
        `  <url><loc>${xmlEscape(`${base}/category/${encodeURIComponent(c.slug)}`)}</loc>` +
          `<changefreq>daily</changefreq><priority>0.6</priority></url>`
      );
    }

    for (const t of tags) {
      if ((t.refCount || 0) <= 0) continue;
      urls.push(
        `  <url><loc>${xmlEscape(`${base}/tag/${encodeURIComponent(t.name)}`)}</loc>` +
          `<changefreq>weekly</changefreq><priority>0.5</priority></url>`
      );
    }

    for (const b of blogs) {
      const lastmod = toW3CDate(b.updatedAt || b.publishedAt);
      urls.push(
        `  <url><loc>${xmlEscape(`${base}/blog/${b.id}`)}</loc>` +
          `<lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${urls.join('\n')}\n` +
      `</urlset>`;

    res.type('application/xml; charset=utf-8').send(xml);
  },

  /** RSS 2.0 订阅源 */
  async rss(req, res) {
    const base = siteUrlOf(req);
    const blogs = await blogDao.findForFeed(20);

    const items = blogs
      .map((b) => {
        const link = `${base}/blog/${b.id}`;
        const desc = b.summary
          ? stripTags(b.summary)
          : stripTags(truncateText(markdownToText(b.content || ''), 200));
        const pub = toRfc822(b.publishedAt || b.updatedAt);
        return (
          `    <item>\n` +
          `      <title>${xmlEscape(b.title)}</title>\n` +
          `      <link>${xmlEscape(link)}</link>\n` +
          `      <guid isPermaLink="true">${xmlEscape(link)}</guid>\n` +
          `      <pubDate>${pub}</pubDate>\n` +
          `      <dc:creator>${xmlEscape(b.authorName || 'anonymous')}</dc:creator>\n` +
          `      <description>${xmlEscape(desc)}</description>\n` +
          `    </item>`
        );
      })
      .join('\n');

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
      `  <channel>\n` +
      `    <title>${xmlEscape(config.siteName)}</title>\n` +
      `    <link>${xmlEscape(base)}</link>\n` +
      `    <atom:link href="${xmlEscape(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />\n` +
      `    <description>${xmlEscape(config.siteDesc)}</description>\n` +
      `    <language>${xmlEscape(config.lang)}</language>\n` +
      `    <lastBuildDate>${toRfc822(new Date())}</lastBuildDate>\n` +
      `${items}\n` +
      `  </channel>\n` +
      `</rss>`;

    res.type('application/rss+xml; charset=utf-8').send(xml);
  },

  /** robots.txt */
  robots(req, res) {
    const base = siteUrlOf(req);
    const text = `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
    res.type('text/plain; charset=utf-8').send(text);
  },
};
