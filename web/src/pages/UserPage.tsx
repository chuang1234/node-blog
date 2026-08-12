/**
 * 用户公开主页（/user/:id）
 * 展示用户基本资料与统计，并提供五个标签页：
 *  - 文章：该用户发布的公开文章
 *  - 点赞：该用户点赞过的文章
 *  - 收藏：该用户收藏的文章
 *  - 粉丝：关注该用户的人
 *  - 关注：该用户关注的人
 * 所有内容均为公开信息，无需登录即可访问；关注/取关需登录。
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, Avatar, Spin, Empty, Button, Statistic, Result } from 'antd';
import { UserAddOutlined, CheckOutlined } from '@ant-design/icons';
import { userApi, blogApi } from '@/api';
import { useAppSelector } from '@/store';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import type { Blog, FollowUser, User } from '@/types';
import { getImageUrl, formatCount, formatDate } from '@/utils/format';
import BlogCard from '@/components/BlogCard';
import FollowUserItem from '@/components/FollowUserItem';
import './UserPage.less';

type TabKey = 'articles' | 'likes' | 'favorites' | 'followers' | 'following';
const PAGE_SIZE = 12;
const FOLLOW_PAGE_SIZE = 20;

export default function UserPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const userId = Number(id);
  const me = useAppSelector((s) => s.auth.user);
  const requireLogin = useRequireLogin();
  const isSelf = !!me && me.id === userId;

  const [profile, setProfile] = useState<User | null>(null);
  const [following, setFollowing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('articles');

  // 博客类标签数据
  const [items, setItems] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);

  // 关注类标签数据
  const [followItems, setFollowItems] = useState<FollowUser[]>([]);
  const [followTotal, setFollowTotal] = useState(0);
  const [followPageNum, setFollowPageNum] = useState(1);
  const [followLoading, setFollowLoading] = useState(false);

  // 加载用户公开资料
  useEffect(() => {
    setNotFound(false);
    setProfile(null);
    setFollowing(false);
    if (Number.isNaN(userId)) {
      setNotFound(true);
      return;
    }
    userApi
      .publicProfile(userId)
      .then((p) => {
        setProfile(p);
        setFollowing(!!p.isFollowing);
      })
      .catch(() => setNotFound(true));
  }, [userId]);

  const isBlogTab = tab === 'articles' || tab === 'likes' || tab === 'favorites';
  const isFollowTab = tab === 'followers' || tab === 'following';

  const fetchBlogs = useCallback(
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

  const fetchFollows = useCallback(
    async (page: number) => {
      setFollowLoading(true);
      try {
        const params = { pageNum: page, pageSize: FOLLOW_PAGE_SIZE };
        const res =
          tab === 'followers'
            ? await userApi.followers(userId, params)
            : await userApi.following(userId, params);
        setFollowItems((prev) => (page === 1 ? res.list : [...prev, ...res.list]));
        setFollowTotal(res.pagination?.total ?? 0);
      } catch {
        /* 拦截器已提示 */
      } finally {
        setFollowLoading(false);
      }
    },
    [tab, userId]
  );

  // 切换标签 / 用户时重置两类列表
  useEffect(() => {
    setPageNum(1);
    setItems([]);
    setTotal(0);
    setFollowPageNum(1);
    setFollowItems([]);
    setFollowTotal(0);
  }, [tab, userId]);

  useEffect(() => {
    if (!Number.isNaN(userId) && isBlogTab) fetchBlogs(pageNum);
  }, [pageNum, fetchBlogs, isBlogTab, userId]);

  useEffect(() => {
    if (!Number.isNaN(userId) && isFollowTab) fetchFollows(followPageNum);
  }, [followPageNum, fetchFollows, isFollowTab, userId]);

  const onToggleFollow = async () => {
    if (!requireLogin()) return; // 未登录：弹登录提示，不跳转整页
    try {
      if (following) {
        await userApi.unfollow(userId);
        setFollowing(false);
        setProfile((p) => (p ? { ...p, followerCount: Math.max(0, (p.followerCount || 0) - 1) } : p));
      } else {
        await userApi.follow(userId);
        setFollowing(true);
        setProfile((p) => (p ? { ...p, followerCount: (p.followerCount || 0) + 1 } : p));
      }
    } catch {
      /* 拦截器已提示 */
    }
  };

  const renderBlogList = () => (
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

  const renderFollowList = () => (
    <>
      <Spin spinning={followLoading}>
        {followItems.length === 0 && !followLoading ? (
          <Empty description={t('user.empty')} style={{ padding: 40 }} />
        ) : (
          <div className="user-page__follow-list">
            {followItems.map((u) => (
              <FollowUserItem key={u.id} user={u} currentUserId={me?.id} />
            ))}
          </div>
        )}
      </Spin>
      {followItems.length < followTotal && (
        <div className="user-page__more">
          <Button loading={followLoading} onClick={() => setFollowPageNum((p) => p + 1)}>
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
          {!isSelf && (
            <Button
              className={`user-page__follow-btn${following ? ' is-following' : ''}`}
              type={following ? 'default' : 'primary'}
              icon={following ? <CheckOutlined /> : <UserAddOutlined />}
              onClick={onToggleFollow}
            >
              {following ? t('user.followed') : t('user.follow')}
            </Button>
          )}
          <div className="user-page__stats">
            <Statistic title={t('profile.blogCount')} value={profile.blogCount || 0} />
            <div
              className="user-page__stat-clickable"
              onClick={() => setTab('followers')}
              role="button"
            >
              <Statistic title={t('profile.followers')} value={profile.followerCount || 0} />
            </div>
            <div
              className="user-page__stat-clickable"
              onClick={() => setTab('following')}
              role="button"
            >
              <Statistic title={t('profile.following')} value={profile.followingCount || 0} />
            </div>
            <Statistic title={t('profile.totalLikes')} value={formatCount(profile.totalLikes)} />
          </div>
        </div>
      )}

      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)} className="user-page__tabs">
        <Tabs.TabPane tab={t('profile.userArticles')} key="articles">
          {renderBlogList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('profile.userLikes')} key="likes">
          {renderBlogList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('profile.userFavorites')} key="favorites">
          {renderBlogList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('user.followers')} key="followers">
          {renderFollowList()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('user.following')} key="following">
          {renderFollowList()}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
