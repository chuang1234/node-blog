/**
 * 前台布局：顶部导航 + 内容区（路由出口）+ 页脚 + 全局 AI 助手入口
 */
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AiAssistant from '@/components/AiAssistant';
import './MainLayout.less';

const { Content } = Layout;

export default function MainLayout() {
  const location = useLocation();

  // 路由切换回到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <Layout className="main-layout">
      <Header />
      <Content className="main-layout__content">
        <Outlet />
      </Content>
      <Footer />
      <AiAssistant />
    </Layout>
  );
}
