/**
 * i18n 初始化
 *
 * 中英文使用完全相同的嵌套 key，通过 t('nav.home') 这样的点路径解析。
 * 语言偏好持久化到 localStorage，刷新后保持。
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN';
import enUS from './en-US';

export const LANG_KEY = 'ai_blog_lang';

export type LangCode = 'zh-CN' | 'en-US';

/** 读取初始语言：本地存储 > 浏览器语言 > 中文兜底 */
function detectLang(): LangCode {
  const saved = localStorage.getItem(LANG_KEY) as LangCode | null;
  if (saved === 'zh-CN' || saved === 'en-US') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: detectLang(),
  fallbackLng: 'zh-CN',
  interpolation: {
    // React 已自带 XSS 转义
    escapeValue: false,
  },
  // key 不存在时返回 key 本身，便于开发期发现遗漏
  parseMissingKeyHandler: (key) => key,
});

/** 切换语言并持久化 */
export function changeLanguage(lang: LangCode) {
  i18n.changeLanguage(lang);
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

export default i18n;
