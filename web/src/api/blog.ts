/**
 * 博客相关接口
 */
import { request } from '@/utils/request';
import type { Blog, BlogListQuery, BlogPayload, BlogStatus, PageData } from '@/types';

export const blogApi = {
  /** 博客列表（公开，支持分页/分类/标签/搜索） */
  list: (params: BlogListQuery) => request.get<PageData<Blog>>('/api/blogs', params),

  /** 热门文章 */
  hot: (limit = 8) => request.get<Blog[]>('/api/blogs/hot', { limit }),

  /** 我的文章（含草稿） */
  myList: (params: BlogListQuery) => request.get<PageData<Blog>>('/api/blogs/mine', params),

  /** 文章详情 */
  detail: (id: number) => request.get<Blog>(`/api/blogs/${id}`),

  /** 相关推荐 */
  related: (id: number) => request.get<Blog[]>(`/api/blogs/${id}/related`),

  /** 创建文章 */
  create: (data: BlogPayload) => request.post<{ id: number }>('/api/blogs', data),

  /** 更新文章 */
  update: (id: number, data: Partial<BlogPayload>) => request.put<null>(`/api/blogs/${id}`, data),

  /** 修改状态（草稿/发布/下线） */
  changeStatus: (id: number, status: BlogStatus) =>
    request.patch<null>(`/api/blogs/${id}/status`, { status }),

  /** 删除文章 */
  remove: (id: number) => request.delete<null>(`/api/blogs/${id}`),

  /** 上传封面 */
  uploadCover: (file: File) => request.upload<{ url: string }>('/api/blogs/cover', file),

  /** 上传正文配图 */
  uploadImage: (file: File) => request.upload<{ url: string }>('/api/blogs/image', file),

  // ---------------- 管理端 ----------------

  adminList: (params: BlogListQuery) => request.get<PageData<Blog>>('/api/admin/blogs', params),

  adminSetTop: (id: number, isTop: boolean) =>
    request.patch<null>(`/api/admin/blogs/${id}/top`, { isTop }),

  adminChangeStatus: (id: number, status: BlogStatus) =>
    request.patch<null>(`/api/admin/blogs/${id}/status`, { status }),

  adminRemove: (id: number) => request.delete<null>(`/api/admin/blogs/${id}`),
};
