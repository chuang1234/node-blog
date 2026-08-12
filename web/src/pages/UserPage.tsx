/**
 * 用户公开主页（/user/:id）
 * 展示用户基本资料与统计，并提供三个标签页：
 *  - 文章：该用户发布的公开文章
 *  - 点赞：该用户点赞过的文章
 *  - 收藏：该用户收藏的文章
 * 所有内容均为公开信息，无需登录即可访问。
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, Avatar, Spin, Empty, Button, Statistic, Result } from 'antd';
import { userApi, blogApi } from '@/api';
import type { Blog, User } from '@/types';
import { getImageUrl, formatCount, formatDate } from '@/utils/format';
import BlogCard from '@/components/BlogCard';
import './UserPage.less';

type TabKey = 'articles' | 'likes' | 'favorites';
const PAGE_SIZE = 12;

export default function UserPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const userId = Number(id);

  const [profile, setProfile] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('articles');
  const [items, setItems] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);

  // 加载用户公开资料
  useEffect(() => {
    setNotFound(false);
    setProfile(null);
    if (Number.isNaN(userId)) {
      setNotFound(true);
      return;
    }
    userApi.publicProfile(userId).then(setProfile).catch(() => setNotFound(true));
  }, [userId]);

  const fetchPage = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = { pageNum: page, pageSize: PAGE_SIZE };
        let res;
        if (tab === 'articles') res = await blogApi.list({ userId, ...params });
        else if (tab === 'likes') res = await userApi.userLikes(userId, params);
        else res = await userApi.userFavorites(userId, params);
        setItems((prev) => (page === 1 ? res.list : [...prev, ...res.list]));
        setTotal(res.pagination?.total ?? 0);
      } catch {
        /* 拦截器已提示 */
      } finally {
        setLoading(false);
      }
    },
    [tab, userId]
  );

  // 切换标签 / 用户时重置列表
  useEffect(() => {
    setPageNum(1);
    setItems([]);
    setTotal(0);
  }, [tab, userId]);

  // pageNum 变化即拉取：第 1 页为重置，后续为追加
  useEffect(() => {
    if (Number.isNaN(userId)) return;
    fetchPage(pageNum);
  }, [pageNum, fetchPage]);

  const renderList = () => (
    <>
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description={t('user.empty')} style={{ padding: 40 }} />
        ) : (
          <div className="user-page__grid">
            {items.map((b) => (
              <BlogCard key={b.id} blog={b} showAuthor={false} />
            ))}
          </div>
        )}
      </Spin>
      {items.length < total && (
        <div className="user-page__more">
          <Button loading={loading} onClick={() => setPageNum((p) => p + 1)}>
            {t('common.more')}
          </Button>
        </div>
      )}
    </>
  );

  if (notFound) {
    return (
      <div className="user-page container">
        <Result status="404" title={t('user.notFound')} />
      </div>
    );
  }

  return (
    <div className="user-page container">
      {profile && (
        <div className="user-page__header">
          <Avatar size={72} src={getImageUrl(profile.avatar) || undefined}>
            {profile.nickname?.[0]}
          </Avatar>
          <div className="user-page__info">
            <h2>{profile.nickname}</h2>
            <p className="user-page__username">@{profile.username}</p>
            {profile.bio && <p className="user-page__bio">{profile.bio}</p>}
            <span className="user-page__joined">
              {t('profile.joinedAt')} {formatDate(profile.createdAt, 'YYYY-MM-DD')}
            </span>
          </div>
          <div className="user-page__stats">
            <Statistic title={t('profile.blogCount')} value={profile.blogCount || 0} />
            <Statistic title={t('profile.totalViews')} value={formatCount(profile.totalViews)} />
            <Statistic title={t('profile.totalLikes')} value={formatCount(profile.totalLikes)} />
          </div>
        </div>
      )}

      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)} className="user-page__tabs">
        <Tabs.TabPane tab={t('profile.userArticles')} key="articles">
          {renderList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('profile.userLikes')} key="likes">
          {renderList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('profile.userFavorites')} key="favorites">
          {renderList()}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
