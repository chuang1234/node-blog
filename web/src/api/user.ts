/**
 * 用户相关接口
 */
import { request } from '@/utils/request';
import type {
  LoginPayload,
  LoginResult,
  PageData,
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
