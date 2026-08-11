/**
 * AI 状态 Slice
 * 缓存 AI 能力状态（是否开启、当前模型、是否离线引擎），供全局组件读取
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { aiApi } from '@/api';
import type { AiStatus } from '@/types';

interface AiState {
  status: AiStatus | null;
  loading: boolean;
  /** 状态拉取失败（后端未启动或 AI 模块异常） */
  error: boolean;
}

const initialState: AiState = {
  status: null,
  loading: false,
  error: false,
};

/** 拉取 AI 能力状态 */
export const fetchAiStatus = createAsyncThunk('ai/fetchStatus', async () => {
  return aiApi.status();
});

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiStatus.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(fetchAiStatus.fulfilled, (state, action) => {
        state.status = action.payload;
        state.loading = false;
      })
      .addCase(fetchAiStatus.rejected, (state) => {
        state.loading = false;
        state.error = true;
      });
  },
});

export default aiSlice.reducer;
