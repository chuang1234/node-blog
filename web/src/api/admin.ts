/**
 * 后台管理接口（数据看板、AI 参数、AI 日志、敏感词）
 * 全部需要管理员权限
 */
import { request } from '@/utils/request';
import type {
  AiConfigItem,
  AiLog,
  PageData,
  SensitiveWord,
  StatsDistribution,
  StatsOverview,
  TrendPoint,
} from '@/types';

export const adminApi = {
  // ---------------- 数据看板 ----------------

  overview: () => request.get<StatsOverview>('/api/admin/stats/overview'),

  trend: (days = 7) => request.get<TrendPoint[]>('/api/admin/stats/trend', { days }),

  distribution: () => request.get<StatsDistribution>('/api/admin/stats/distribution'),

  /** 手动生成昨日统计快照 */
  generateSnapshot: () => request.post<{ date: string }>('/api/admin/stats/snapshot'),

  // ---------------- AI 参数配置 ----------------

  aiConfigList: () => request.get<AiConfigItem[]>('/api/admin/ai/configs'),

  aiConfigSave: (items: Array<{ configKey: string; configValue: string | number | boolean }>) =>
    request.put<{ count: number }>('/api/admin/ai/configs', { items }),

  // ---------------- AI 调用日志 ----------------

  aiLogList: (params: {
    pageNum?: number;
    pageSize?: number;
    action?: string;
    status?: 'success' | 'failed' | '';
    userId?: number | '';
  }) => request.get<PageData<AiLog>>('/api/admin/ai/logs', params),

  aiLogSummary: () =>
    request.get<{
      totalCalls: number;
      totalTokens: number;
      avgDuration: number;
      failedCount: number;
    }>('/api/admin/ai/logs/summary'),

  // ---------------- 敏感词管理 ----------------

  wordList: (params: { pageNum?: number; pageSize?: number; keyword?: string; category?: string }) =>
    request.get<PageData<SensitiveWord>>('/api/admin/words', params),

  wordCreate: (data: { word: string; category?: string; level?: number }) =>
    request.post<{ id: number }>('/api/admin/words', data),

  wordUpdate: (id: number, data: { category?: string; level?: number; enabled?: boolean }) =>
    request.patch<null>(`/api/admin/words/${id}`, data),

  wordRemove: (id: number) => request.delete<null>(`/api/admin/words/${id}`),
};
