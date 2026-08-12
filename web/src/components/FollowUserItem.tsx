/**
 * FollowUserItem —— 关注列表中的单行用户
 * 用于「粉丝 / 关注」标签页，展示头像+昵称+简介，并提供关注/取消关注按钮。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, Button } from 'antd';
import { UserAddOutlined, CheckOutlined } from '@ant-design/icons';
import { userApi } from '@/api';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import { getImageUrl } from '@/utils/format';
import type { FollowUser } from '@/types';
import './FollowUserItem.less';

interface Props {
  user: FollowUser;
  /** 当前登录用户 ID，用于隐藏「自己关注自己」按钮 */
  currentUserId?: number | null;
}

export default function FollowUserItem({ user, currentUserId }: Props) {
  const { t } = useTranslation();
  const requireLogin = useRequireLogin();
  const [following, setFollowing] = useState(!!user.isFollowing);
  const [loading, setLoading] = useState(false);

  const isSelf = !!currentUserId && currentUserId === user.id;

  const toggle = async () => {
    if (!requireLogin()) return; // 未登录：弹登录提示，不跳转
    setLoading(true);
    try {
      if (following) {
        await userApi.unfollow(user.id);
        setFollowing(false);
      } else {
        await userApi.follow(user.id);
        setFollowing(true);
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="follow-user-item">
      <Link to={`/user/${user.id}`} className="follow-user-item__avatar" onClick={stop}>
        <Avatar size={44} src={getImageUrl(user.avatar) || undefined}>
          {user.nickname?.[0]}
        </Avatar>
      </Link>
      <div className="follow-user-item__info">
        <Link to={`/user/${user.id}`} className="follow-user-item__name" onClick={stop}>
          {user.nickname}
        </Link>
        {user.bio && <p className="follow-user-item__bio">{user.bio}</p>}
      </div>
      {!isSelf && (
        <Button
          className={`follow-user-item__btn${following ? ' is-following' : ''}`}
          type={following ? 'default' : 'primary'}
          icon={following ? <CheckOutlined /> : <UserAddOutlined />}
          loading={loading}
          onClick={toggle}
        >
          {following ? t('user.followed') : t('user.follow')}
        </Button>
      )}
    </div>
  );
}
