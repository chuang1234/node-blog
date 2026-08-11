/**
 * 路由守卫
 *
 * RequireAuth：需要登录，未登录跳登录页（携带 redirect）
 * RequireAdmin：需要管理员角色，否则跳 403
 * 两者都等待 auth.initialized 完成，避免刷新时守卫闪烁误跳。
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppSelector } from '@/store';

function FullScreenSpin() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      } as React.CSSProperties}
    >
      <Spin size="large" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initialized } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!initialized) return <FullScreenSpin />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, initialized } = useAppSelector((s) => s.auth);

  if (!initialized) return <FullScreenSpin />;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
