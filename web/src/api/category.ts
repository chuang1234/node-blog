/**
 * 分类与标签接口
 */
import { request } from '@/utils/request';
import type { Category, PageData, Tag } from '@/types';

export const categoryApi = {
  /** 全部分类（公开） */
  listCategories: () => request.get<Category[]>('/api/categories'),

  /** 全部标签（公开） */
  listTags: () => request.get<Tag[]>('/api/tags'),

  /** 热门标签 */
  hotTags: (limit = 20) => request.get<Tag[]>('/api/tags/hot', { limit }),

  // ---------------- 管理端 ----------------

  createCategory: (data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }) => request.post<{ id: number }>('/api/admin/categories', data),

  updateCategory: (
    id: number,
    data: { name?: string; slug?: string; description?: string; icon?: string; sortOrder?: number }
  ) => request.put<null>(`/api/admin/categories/${id}`, data),

  removeCategory: (id: number) => request.delete<null>(`/api/admin/categories/${id}`),

  adminTagPage: (params?: { pageNum?: number; pageSize?: number }) =>
    request.get<PageData<Tag>>('/api/admin/tags', params),

  createTag: (data: { name: string; color?: string }) =>
    request.post<{ id: number }>('/api/admin/tags', data),

  removeTag: (id: number) => request.delete<null>(`/api/admin/tags/${id}`),
};
