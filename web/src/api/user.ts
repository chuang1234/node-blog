/**
 * 用户相关接口
 */
import { request } from '@/utils/request';
import type {
  Blog,
  FollowUser,
  LoginPayload,
  LoginResult,
  PageData,
  PageQuery,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '@/types';

export const userApi = {
  /** 注册 */
  register: (data: RegisterPayload) => request.post<LoginResult>('/api/users/register', data),

  /** 登录 */
  login: (data: LoginPayload) => request.post<LoginResult>('/api/users/login', data),

  /** 获取当前登录用户信息 */
  me: (silent = false) => request.get<User>('/api/users/me', undefined, { silent }),

  /** 更新个人资料 */
  updateProfile: (data: UpdateProfilePayload) => request.put<User>('/api/users/me', data),

  /** 修改密码 */
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request.put<null>('/api/users/me/password', data),

  /** 上传头像 */
  uploadAvatar: (file: File) => request.upload<{ url: string }>('/api/users/me/avatar', file),

  /** 查看他人公开主页 */
  publicProfile: (id: number) => request.get<User>(`/api/users/${id}`),

  /** 查看他人的收藏列表（公开） */
  userFavorites: (id: number, params: PageQuery) =>
    request.get<PageData<Blog>>(`/api/users/${id}/favorites`, params),

  /** 查看他人点赞过的文章（公开） */
  userLikes: (id: number, params: PageQuery) =>
    request.get<PageData<Blog>>(`/api/users/${id}/likes`, params),

  // ---------------- 关注 ----------------

  /** 关注某用户 */
  follow: (id: number) => request.post<null>(`/api/users/${id}/follow`),

  /** 取消关注 */
  unfollow: (id: number) => request.delete<null>(`/api/users/${id}/follow`),

  /** 当前用户是否已关注该用户 */
  followStatus: (id: number) => request.get<{ following: boolean }>(`/api/users/${id}/follow-status`),

  /** 粉丝列表（公开） */
  followers: (id: number, params: PageQuery) =>
    request.get<PageData<FollowUser>>(`/api/users/${id}/followers`, params),

  /** 关注列表（公开） */
  following: (id: number, params: PageQuery) =>
    request.get<PageData<FollowUser>>(`/api/users/${id}/following`, params),

  // ---------------- 管理端 ----------------

  adminList: (params: {
    pageNum?: number;
    pageSize?: number;
    keyword?: string;
    role?: string;
    status?: number | '';
  }) => request.get<PageData<User>>('/api/admin/users', params),

  adminUpdate: (id: number, data: { status?: number; role?: string }) =>
    request.patch<null>(`/api/admin/users/${id}`, data),

  adminRemove: (id: number) => request.delete<null>(`/api/admin/users/${id}`),
};
