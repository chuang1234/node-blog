/**
 * 后台布局：左侧菜单 + 顶部操作栏 + 内容区（路由出口）
 * 仅管理员可进入（由路由守卫 RequireAdmin 保证）
 */
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Menu, Button, Space, Dropdown, Avatar, Tooltip } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  CommentOutlined,
  WarningOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  BarsOutlined,
  AlertOutlined,
  BulbOutlined,
  BulbFilled,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { toggleTheme } from '@/store/themeSlice';
import { getImageUrl } from '@/utils/format';
import './AdminLayout.less';

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const mode = useAppSelector((s) => s.theme.mode);
  const collapsed = useAppSelector((s) => s.theme.siderCollapsed);
  const toggleSider = () => dispatch({ type: 'theme/toggleSider' });

  const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: t('admin.dashboard') },
    { key: '/admin/users', icon: <TeamOutlined />, label: t('admin.users') },
    { key: '/admin/blogs', icon: <FileTextOutlined />, label: t('admin.blogs') },
    { key: '/admin/comments', icon: <CommentOutlined />, label: t('admin.comments') },
    { key: '/admin/reports', icon: <WarningOutlined />, label: t('admin.reports') },
    { key: '/admin/categories', icon: <AppstoreOutlined />, label: t('admin.categories') },
    { key: '/admin/ai-config', icon: <ThunderboltOutlined />, label: t('admin.aiConfig') },
    { key: '/admin/ai-logs', icon: <BarsOutlined />, label: t('admin.aiLogs') },
    { key: '/admin/words', icon: <AlertOutlined />, label: t('admin.sensitiveWords') },
  ];

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: t('nav.profile') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'profile') navigate('/profile');
      else if (key === 'logout') {
        dispatch(logout());
        navigate('/');
      }
    },
  };

  return (
    <Layout className="admin-layout">
      <Sider
        theme={mode === 'dark' ? 'dark' : 'light'}
        collapsible
        collapsed={collapsed}
        onCollapse={toggleSider}
        width={220}
        className="admin-layout__sider"
      >
        <div className="admin-layout__logo">
          <span className="admin-layout__logo-mark">AI</span>
          {!collapsed && <span className="admin-layout__logo-text">管理后台</span>}
        </div>
        <Menu
          mode="inline"
          theme={mode === 'dark' ? 'dark' : 'light'}
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className="admin-layout__header">
          <Space>
            <Link to="/" className="admin-layout__back">
              <HomeOutlined /> {t('admin.backToSite')}
            </Link>
          </Space>
          <Space>
            <Tooltip title={mode === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}>
              <Button
                type="text"
                aria-label="theme"
                onClick={() => dispatch(toggleTheme())}
                icon={mode === 'dark' ? <BulbFilled /> : <BulbOutlined />}
              />
            </Tooltip>
            <Dropdown menu={userMenu} placement="bottomRight">
              <span className="admin-layout__user">
                <Avatar
                  size={32}
                  src={getImageUrl(user?.avatar) || undefined}
                  onError={() => true}
                >
                  {!user?.avatar && (user?.nickname?.[0] || <UserOutlined />)}
                </Avatar>
                <span className="admin-layout__username">{user?.nickname}</span>
              </span>
            </Dropdown>
          </Space>
        </Header>

        <Content className="admin-layout__content">
          <div className="admin-layout__container">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
