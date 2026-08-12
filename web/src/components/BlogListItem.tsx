/**
 * 文章列表项
 * 每行一条的列表样式：左侧封面缩略图，右侧标题（加粗）+ 摘要 + 底部互动数据。
 * 用于首页「列表」显示风格切换。
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tag, Space } from 'antd';
import {
  EyeOutlined,
  LikeOutlined,
  MessageOutlined,
  StarOutlined,
  ThunderboltOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import type { Blog } from '@/types';
import { formatCount, formatDate, readMinutes } from '@/utils/format';
import SmartImage from './SmartImage';
import UserLink from './UserLink';
import './BlogListItem.less';

interface Props {
  blog: Blog;
  /** 是否显示作者信息（列表页通常显示） */
  showAuthor?: boolean;
}

export default function BlogListItem({ blog, showAuthor = true }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const go = () => navigate(`/blog/${blog.id}`);
  const statusTag =
    blog.status === 'published'
      ? null
      : blog.status === 'draft'
      ? t('blog.draft')
      : t('blog.offline');

  return (
    <article className="blog-list-item fade-in-up" onClick={go}>
      {blog.cover ? (
        <div className="blog-list-item__cover">
          <SmartImage src={blog.cover} alt={blog.title} type="cover" />
          {blog.isTop ? (
            <span className="blog-list-item__top">
              <VerticalAlignTopOutlined /> {t('blog.topPost')}
            </span>
          ) : null}
          {blog.isAiAssisted ? (
            <span className="blog-list-item__ai">
              <ThunderboltOutlined /> {t('blog.aiAssisted')}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="blog-list-item__body">
        <div className="blog-list-item__head">
          <h3 className="blog-list-item__title">{blog.title}</h3>
          {statusTag && (
            <Tag color={blog.status === 'draft' ? 'default' : 'warning'} className="blog-list-item__status">
              {statusTag}
            </Tag>
          )}
        </div>

        <p className="blog-list-item__summary">
          {blog.summary || blog.content?.replace(/<[^>]+>/g, '').slice(0, 120)}
        </p>

        <div className="blog-list-item__footer">
          <Space size={18} className="blog-list-item__stats">
            <span className="blog-list-item__stat" title={t('blog.views')}>
              <EyeOutlined /> {formatCount(blog.viewCount)}
            </span>
            <span className="blog-list-item__stat" title={t('blog.comments')}>
              <MessageOutlined /> {formatCount(blog.commentCount)}
            </span>
            <span className="blog-list-item__stat" title={t('blog.likes')}>
              <LikeOutlined /> {formatCount(blog.likeCount)}
            </span>
            <span className="blog-list-item__stat" title={t('blog.favorites')}>
              <StarOutlined /> {formatCount(blog.favoriteCount)}
            </span>
          </Space>

          {showAuthor && (
            <UserLink
              userId={blog.userId}
              name={blog.authorName}
              avatar={blog.authorAvatar}
              size={22}
              className="blog-list-item__author"
            />
          )}

          <span className="blog-list-item__date">
            {formatDate(blog.publishedAt || blog.createdAt, 'YYYY-MM-DD')}
            <span className="blog-list-item__read"> · {t('blog.readTime', { minutes: readMinutes(blog.wordCount) })}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
