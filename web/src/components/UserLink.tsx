/**
 * UserLink —— 可点击跳转到用户主页的头像 + 昵称组合
 * 用于文章详情作者、评论区、文章卡片等任何展示用户的位置。
 * 内部已 stopPropagation，避免触发父级（如整张卡片）的点击事件。
 */
import { Link } from 'react-router-dom';
import { Avatar } from 'antd';
import { getImageUrl } from '@/utils/format';
import './UserLink.less';

interface Props {
  userId: number;
  name?: string;
  avatar?: string;
  /** 头像尺寸，默认 28 */
  size?: number;
  /** 是否显示昵称，默认 true */
  showName?: boolean;
  className?: string;
}

export default function UserLink({ userId, name, avatar, size = 28, showName = true, className }: Props) {
  return (
    <Link
      to={`/user/${userId}`}
      className={`user-link${className ? ` ${className}` : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <Avatar src={getImageUrl(avatar) || undefined} size={size}>
        {name?.[0]}
      </Avatar>
      {showName && <span className="user-link__name">{name}</span>}
    </Link>
  );
}
