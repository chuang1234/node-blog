/**
 * 通知 store：仅维护顶栏未读数量
 * 列表数据由各页面/组件自行拉取，这里只缓存「未读角标」供 Header 显示
 */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '@/api/notification';

interface NotificationState {
  unread: number;
}

const initialState: NotificationState = { unread: 0 };

/** 拉取未读数（Header 登录后调用 + 轮询） */
export const fetchUnread = createAsyncThunk('notification/fetchUnread', async () => {
  const res = await notificationApi.unreadCount();
  return res.unreadCount;
});

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setUnread(state, action: PayloadAction<number>) {
      state.unread = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUnread.fulfilled, (state, action) => {
      state.unread = action.payload;
    });
  },
});

export const { setUnread } = notificationSlice.actions;
export default notificationSlice.reducer;
