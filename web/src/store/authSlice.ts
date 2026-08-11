/**
 * 登录态 Slice
 * token 与用户信息同时保存到 localStorage，刷新后自动恢复
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '@/api';
import { TOKEN_KEY, USER_KEY } from '@/utils/request';
import type { LoginPayload, RegisterPayload, UpdateProfilePayload, User } from '@/types';

interface AuthState {
  token: string;
  user: User | null;
  /** 是否已完成初始化（用于路由守卫避免闪烁） */
  initialized: boolean;
  loading: boolean;
}

/** 从本地存储恢复用户信息 */
function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: readCachedUser(),
  initialized: false,
  loading: false,
};

/** 登录 */
export const login = createAsyncThunk('auth/login', async (payload: LoginPayload) => {
  return userApi.login(payload);
});

/** 注册（注册成功后端直接返回 token，实现自动登录） */
export const register = createAsyncThunk('auth/register', async (payload: RegisterPayload) => {
  return userApi.register(payload);
});

/** 拉取当前用户信息（应用启动时校验 token 有效性） */
export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  return userApi.me(true);
});

/** 更新个人资料 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload: UpdateProfilePayload) => {
    return userApi.updateProfile(payload);
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** 退出登录，清理本地存储 */
    logout(state) {
      state.token = '';
      state.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    /** 局部更新用户信息（如上传头像后） */
    patchUser(state, action: PayloadAction<Partial<User>>) {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
    /** 标记初始化完成 */
    setInitialized(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    const applyLogin = (state: AuthState, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.loading = false;
      state.initialized = true;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    };

    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, applyLogin)
      .addCase(login.rejected, (state) => {
        state.loading = false;
      })

      .addCase(register.pending, (state) => {
        state.loading = true;
      })
      .addCase(register.fulfilled, applyLogin)
      .addCase(register.rejected, (state) => {
        state.loading = false;
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initialized = true;
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        // token 失效：清理登录态
        state.token = '';
        state.user = null;
        state.initialized = true;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      });
  },
});

export const { logout, patchUser, setInitialized } = authSlice.actions;
export default authSlice.reducer;
