/**
 * 前台顶部导航
 *
 * 包含：站点 Logo、主导航、搜索框、主题切换、语言切换、用户菜单。
 * 登录态由 store 驱动；未登录显示登录/注册按钮，登录后显示头像下拉菜单。
 */
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Input, Dropdown, Avatar, Button, Space, Tooltip } from 'antd';
import {
  HomeOutlined,
  CompassOutlined,
  EditOutlined,
  BulbOutlined,
  BulbFilled,
  GlobalOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { toggleTheme } from '@/store/themeSlice';
import { getImageUrl, pageTitle } from '@/utils/format';
import './Header.less';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const mode = useAppSelector((s) => s.theme.mode);
  const lang = useAppSelector((s) => s.theme.lang);
  const [keyword, setKeyword] = useState('');

  const onSearch = (value: string) => {
    const kw = value.trim();
    if (kw) navigate(`/search?keyword=${encodeURIComponent(kw)}`);
    else navigate('/search');
  };

  const switchLang = () => {
    const next = lang === 'zh-CN' ? 'en-US' : 'zh-CN';
    dispatch({ type: 'theme/setLang', payload: next });
  };

  const userMenu = user
    ? {
        items: [
          { key: 'profile', icon: <UserOutlined />, label: t('nav.profile') },
          ...(user.role === 'admin'
            ? [{ key: 'admin', icon: <DashboardOutlined />, label: t('nav.admin') }]
            : []),
          { type: 'divider' as const, key: 'divider' },
          { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), danger: true },
        ],
        onClick: ({ key }: { key: string }) => {
          if (key === 'profile') navigate('/profile');
          else if (key === 'admin') navigate('/admin');
          else if (key === 'logout') {
            dispatch(logout());
            navigate('/');
          }
        },
      }
    : undefined;

  const navItems = [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/search', icon: <CompassOutlined />, label: t('nav.explore') },
  ];

  return (
    <AntHeader className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__logo" onClick={() => (document.title = pageTitle())}>
          <span className="site-header__logo-mark">AI</span>
          <span className="site-header__logo-text">Agent Blog</span>
        </Link>

        <nav className="site-header__nav">
          {navItems.map((item) => {
            const active =
              item.key === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.key);
            return (
              <Link
                key={item.key}
                to={item.key}
                className={`site-header__nav-item${active ? ' is-active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user && (
            <Link
              to="/write"
              className={`site-header__nav-item site-header__write${
                location.pathname.startsWith('/write') || location.pathname.startsWith('/edit') ? ' is-active' : ''
              }`}
            >
              <EditOutlined />
              <span>{t('nav.write')}</span>
            </Link>
          )}
        </nav>

        <div className="site-header__search">
          <Input.Search
            allowClear
            placeholder={t('nav.searchPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={onSearch}
            enterButton
          />
        </div>

        <Space size={4} className="site-header__actions">
          <Tooltip title={mode === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}>
            <Button
              type="text"
              aria-label="theme"
              onClick={() => dispatch(toggleTheme())}
              icon={mode === 'dark' ? <BulbFilled /> : <BulbOutlined />}
            />
          </Tooltip>
          <Tooltip title={t('nav.language')}>
            <Button type="text" aria-label="language" onClick={switchLang} icon={<GlobalOutlined />}>
              <span className="site-header__lang">{lang === 'zh-CN' ? '中' : 'EN'}</span>
            </Button>
          </Tooltip>

          {user ? (
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <span className="site-header__user">
                <Avatar
                  size={32}
                  src={getImageUrl(user.avatar) || undefined}
                  alt={user.nickname}
                  onError={() => true}
                >
                  {!user.avatar && (user.nickname?.[0] || <UserOutlined />)}
                </Avatar>
              </span>
            </Dropdown>
          ) : (
            <Space size={8}>
              <Button type="text" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                {t('nav.register')}
              </Button>
            </Space>
          )}
        </Space>
      </div>
    </AntHeader>
  );
}
