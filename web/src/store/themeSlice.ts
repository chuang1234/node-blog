/**
 * 主题与语言 Slice
 * 深色/浅色模式通过 <html data-theme> 切换，偏好持久化到 localStorage
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { changeLanguage, LANG_KEY, type LangCode } from '@/locales';

export const THEME_KEY = 'ai_blog_theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  lang: LangCode;
  /** 移动端侧边栏折叠态 */
  siderCollapsed: boolean;
}

/** 读取初始主题：本地存储 > 系统偏好 > 浅色兜底 */
function detectTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 把主题写入 html 标签，供 CSS 变量切换 */
export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
}

const initialMode = detectTheme();
applyTheme(initialMode);

const initialState: ThemeState = {
  mode: initialMode,
  lang: (localStorage.getItem(LANG_KEY) as LangCode) || 'zh-CN',
  siderCollapsed: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      applyTheme(state.mode);
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      applyTheme(state.mode);
    },
    setLang(state, action: PayloadAction<LangCode>) {
      state.lang = action.payload;
      changeLanguage(action.payload);
    },
    toggleSider(state) {
      state.siderCollapsed = !state.siderCollapsed;
    },
    setSiderCollapsed(state, action: PayloadAction<boolean>) {
      state.siderCollapsed = action.payload;
    },
  },
});

export const { toggleTheme, setTheme, setLang, toggleSider, setSiderCollapsed } = themeSlice.actions;
export default themeSlice.reducer;
