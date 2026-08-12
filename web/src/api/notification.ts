/**
 * 站内通知接口
 */
import { request } from '@/utils/request';
import type { NotificationListResult } from '@/types';

export const notificationApi = {
  /** 通知列表（含未读数） */
  list: (params?: { pageNum?: number; pageSize?: number }) =>
    request.get<NotificationListResult>('/api/notifications', params),

  /** 仅未读数量 */
  unreadCount: () => request.get<{ unreadCount: number }>('/api/notifications/unread-count'),

  /** 标记单条已读 */
  markRead: (id: number) => request.post<null>(`/api/notifications/${id}/read`),

  /** 全部已读 */
  markAllRead: () => request.post<null>('/api/notifications/read-all'),

  /** 删除单条 */
  remove: (id: number) => request.delete<null>(`/api/notifications/${id}`),
};
