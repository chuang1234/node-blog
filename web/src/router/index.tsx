/**
 * 路由表
 *
 * 结构：
 *  - 独立页面：/login、/register、/403（不套用前台布局）
 *  - 前台布局 MainLayout：首页、详情、搜索、写文章、个人中心、404
 *  - 后台布局 AdminLayout：仅管理员可进入，含数据看板与各管理页
 */
import { Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';

import Home from '@/pages/Home';
import BlogDetail from '@/pages/BlogDetail';
import Editor from '@/pages/Editor';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import UserPage from '@/pages/UserPage';
import NotificationPage from '@/pages/NotificationPage';
import Search from '@/pages/Search';
import CategoryPage from '@/pages/CategoryPage';
import TagPage from '@/pages/TagPage';
import NotFound from '@/pages/NotFound';
import Forbidden from '@/pages/Forbidden';

import Dashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminBlogs from '@/pages/admin/AdminBlogs';
import AdminComments from '@/pages/admin/AdminComments';
import AdminReports from '@/pages/admin/AdminReports';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminAiConfig from '@/pages/admin/AdminAiConfig';
import AdminAiLogs from '@/pages/admin/AdminAiLogs';
import AdminWords from '@/pages/admin/AdminWords';

import { RequireAuth, RequireAdmin } from './guards';

export function AppRoutes() {
  return (
    <Routes>
      {/* 独立页面 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/403" element={<Forbidden />} />

      {/* 前台布局 */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/category" element={<CategoryPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/tag" element={<TagPage />} />
        <Route path="/tag/:name" element={<TagPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/user/:id" element={<UserPage />} />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationPage />
            </RequireAuth>
          }
        />
        <Route
          path="/write"
          element={
            <RequireAuth>
              <Editor />
            </RequireAuth>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <RequireAuth>
              <Editor />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 后台布局（仅管理员） */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="blogs" element={<AdminBlogs />} />
        <Route path="comments" element={<AdminComments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="ai-config" element={<AdminAiConfig />} />
        <Route path="ai-logs" element={<AdminAiLogs />} />
        <Route path="words" element={<AdminWords />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
