/**
 * 应用根组件
 *
 * - 根据 store 中的主题状态动态切换 antd 主题算法与主题色
 * - 启动时校验登录态（fetchMe）并拉取 AI 能力状态（fetchAiStatus）
 * - 语言包在 main.tsx 中通过外层 ConfigProvider 处理
 * - 渲染路由表（定义于 @/router）
 */
import { useEffect } from 'react';
import { theme, ConfigProvider } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMe } from '@/store/authSlice';
import { fetchAiStatus } from '@/store/aiSlice';
import { AppRoutes } from '@/router';

export default function App() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);

  // 应用启动：校验 token 有效性 + 拉取 AI 能力状态
  useEffect(() => {
    dispatch(fetchMe());
    dispatch(fetchAiStatus());
  }, [dispatch]);

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: mode === 'dark' ? '#3c89ff' : '#1677ff',
          borderRadius: 10,
        },
      }}
    >
      <AppRoutes />
    </ConfigProvider>
  );
}
