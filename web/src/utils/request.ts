/**
 * Axios 请求封装
 *
 * 统一处理：
 * - baseURL 与超时（AI 接口耗时较长，单独放宽）
 * - 请求头自动携带 JWT
 * - 响应拆包：直接返回 data 字段，业务码非 0 统一抛错
 * - 401 自动清理登录态并跳转登录页
 * - 429 限流、422 内容违规等业务错误的友好提示
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

/** 本地存储 key */
export const TOKEN_KEY = 'ai_blog_token';
export const USER_KEY = 'ai_blog_user';

/** 后端业务错误码，与 server/src/utils/response.js 保持一致 */
export const CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 40001,
  UNAUTHORIZED: 40101,
  TOKEN_EXPIRED: 40102,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  CONFLICT: 40901,
  RATE_LIMITED: 42901,
  CONTENT_VIOLATION: 42201,
  SERVER_ERROR: 50001,
  AI_ERROR: 50002,
  DB_ERROR: 50003,
} as const;

/** 业务异常，携带错误码与附加数据，便于调用方做差异化处理 */
export class ApiError extends Error {
  code: number;
  data: unknown;

  constructor(message: string, code: number, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

/** 扩展请求配置：允许单个请求关闭全局错误提示 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 设为 true 时不弹出全局 message 提示，由调用方自行处理 */
  silent?: boolean;
}

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------- 请求拦截 ----------------
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // AI 相关接口生成耗时较长，放宽到 90 秒
    if (config.url && config.url.includes('/ai/')) {
      config.timeout = 90000;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** 防止 401 时短时间内重复跳转与重复提示 */
let redirecting = false;

// ---------------- 响应拦截 ----------------
instance.interceptors.response.use(
  (response) => {
    const config = response.config as RequestConfig;
    const body = response.data as ApiResponse;

    // 非标准响应（如文件流）直接放行
    if (body === null || typeof body !== 'object' || !('code' in body)) {
      return response;
    }

    if (body.code === CODES.SUCCESS) {
      // 拆包：调用方直接拿到 data
      return body.data as never;
    }

    // 业务错误
    const err = new ApiError(body.message || '操作失败', body.code, body.data);
    if (!config.silent) {
      if (body.code === CODES.CONTENT_VIOLATION) {
        message.warning(body.message || '内容存在风险，请修改后重试');
      } else if (body.code === CODES.RATE_LIMITED) {
        message.warning(body.message || '操作过于频繁，请稍后再试');
      } else {
        message.error(body.message || '操作失败');
      }
    }
    return Promise.reject(err);
  },
  (error: AxiosError<ApiResponse>) => {
    const config = (error.config || {}) as RequestConfig;
    const status = error.response?.status;
    const body = error.response?.data;
    const bizCode = body?.code ?? CODES.SERVER_ERROR;
    let text = body?.message || error.message || '网络异常';

    // 401：登录态失效
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // silent 请求（如 App 启动时的 fetchMe）只清理登录态，不自动跳转登录页，
      // 避免未登录用户访问公开页面（如分享的文章链接）时被强制甩到登录页
      if (!config.silent && !redirecting && !location.pathname.startsWith('/login')) {
        redirecting = true;
        message.warning(text || '登录已失效，请重新登录');
        const redirect = encodeURIComponent(location.pathname + location.search);
        setTimeout(() => {
          location.href = `/login?redirect=${redirect}`;
          redirecting = false;
        }, 600);
      }
      return Promise.reject(new ApiError(text, bizCode, body?.data));
    }

    if (!config.silent) {
      if (error.code === 'ECONNABORTED') {
        text = '请求超时，AI 生成内容可能需要较长时间，请稍后重试';
        message.warning(text);
      } else if (status === 403) {
        message.error(text || '没有操作权限');
      } else if (status === 404) {
        message.error(text || '请求的资源不存在');
      } else if (status === 422) {
        message.warning(text || '内容存在风险，请修改后重试');
      } else if (status === 429) {
        message.warning(text || '操作过于频繁，请稍后再试');
      } else if (status && status >= 500) {
        message.error(text || '服务器开小差了，请稍后重试');
      } else if (!error.response) {
        message.error('无法连接服务器，请检查后端服务是否已启动');
      } else {
        message.error(text);
      }
    }

    return Promise.reject(new ApiError(text, bizCode, body?.data));
  }
);

/**
 * 统一请求方法
 * 泛型 T 为业务 data 的类型，拦截器已完成拆包
 */
export const request = {
  get<T = unknown>(url: string, params?: object, config?: RequestConfig): Promise<T> {
    return instance.get(url, { params, ...config }) as unknown as Promise<T>;
  },

  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>;
  },

  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>;
  },

  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>;
  },

  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>;
  },

  /** 上传文件（FormData），自动交由浏览器设置 boundary */
  upload<T = unknown>(url: string, file: File, fieldName = 'file', config?: RequestConfig): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    return instance.post(url, form, {
      ...config,
      headers: { ...(config?.headers || {}), 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<T>;
  },
};

export default instance;
