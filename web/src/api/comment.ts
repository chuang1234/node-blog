/**
 * 评论与互动（点赞/收藏/举报）接口
 */
import { request } from '@/utils/request';
import type { Blog, Comment, CommentPayload, CommentStatus, PageData, Report, Sentiment } from '@/types';

export const commentApi = {
  /** 某篇文章的评论列表 */
  listByBlog: (
    blogId: number,
    params?: { pageNum?: number; pageSize?: number; orderBy?: 'latest' | 'hot'; sentiment?: Sentiment | '' }
  ) => request.get<PageData<Comment>>(`/api/comments/blog/${blogId}`, params),

  /** 发表评论（后端会自动审核 + 情感分析） */
  create: (data: CommentPayload) => request.post<Comment>('/api/comments', data),

  /** 删除评论 */
  remove: (id: number) => request.delete<null>(`/api/comments/${id}`),

  /** 举报评论 */
  report: (id: number, reason: string) => request.post<null>(`/api/comments/${id}/report`, { reason }),

  // ---------------- 点赞 / 收藏 ----------------

  /** 点赞/取消点赞（幂等切换） */
  toggleLike: (targetType: 'blog' | 'comment', targetId: number) =>
    request.post<{ liked: boolean; likeCount: number }>(`/api/interactions/like/${targetType}/${targetId}`),

  /** 收藏/取消收藏 */
  toggleFavorite: (blogId: number) =>
    request.post<{ favorited: boolean; favoriteCount: number }>(`/api/interactions/favorite/${blogId}`),

  /** 我的收藏列表 */
  myFavorites: (params?: { pageNum?: number; pageSize?: number }) =>
    request.get<PageData<Blog>>('/api/interactions/favorites', params),

  // ---------------- 管理端 ----------------

  adminList: (params: {
    pageNum?: number;
    pageSize?: number;
    keyword?: string;
    sentiment?: Sentiment | '';
    status?: CommentStatus | '';
    blogId?: number | '';
  }) => request.get<PageData<Comment>>('/api/admin/comments', params),

  adminUpdateStatus: (id: number, status: CommentStatus) =>
    request.patch<null>(`/api/admin/comments/${id}/status`, { status }),

  adminRemove: (id: number) => request.delete<null>(`/api/admin/comments/${id}`),

  adminReportList: (params?: { pageNum?: number; pageSize?: number }) =>
    request.get<PageData<Report>>('/api/admin/reports', params),

  adminHandleReport: (id: number, status: 'resolved' | 'ignored') =>
    request.patch<null>(`/api/admin/reports/${id}`, { status }),
};
