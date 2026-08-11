/**
 * 文章卡片
 * 用于首页、搜索、个人中心、管理端列表的统一展示。
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
import './BlogCard.less';

interface Props {
  blog: Blog;
  /** 是否显示作者信息（列表页通常显示） */
  showAuthor?: boolean;
}

export default function BlogCard({ blog, showAuthor = true }: Props) {
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
    <article className="blog-card fade-in-up" onClick={go}>
      <div className="blog-card__cover">
        <SmartImage src={blog.cover} alt={blog.title} type="cover" />
        {blog.isTop ? (
          <span className="blog-card__top">
            <VerticalAlignTopOutlined /> {t('blog.topPost')}
          </span>
        ) : null}
        {blog.isAiAssisted ? (
          <span className="blog-card__ai">
            <ThunderboltOutlined /> {t('blog.aiAssisted')}
          </span>
        ) : null}
      </div>

      <div className="blog-card__body">
        <h3 className="blog-card__title">{blog.title}</h3>
        <p className="blog-card__summary">{blog.summary || blog.content?.replace(/<[^>]+>/g, '').slice(0, 80)}</p>

        <div className="blog-card__tags">
          {blog.tags?.slice(0, 3).map((tag) => (
            <Tag key={tag.id} color={tag.color || 'blue'} bordered={false}>
              {tag.name}
            </Tag>
          ))}
        </div>

        <div className="blog-card__meta">
          {showAuthor && (
            <Space size={6} className="blog-card__author">
              <SmartImage
                src={blog.authorAvatar}
                alt={blog.authorName}
                type="avatar"
                className="blog-card__avatar"
              />
              <span>{blog.authorName}</span>
            </Space>
          )}
          <Space size={14} className="blog-card__stats">
            <span title={t('blog.views')}>
              <EyeOutlined /> {formatCount(blog.viewCount)}
            </span>
            <span title={t('blog.likes')}>
              <LikeOutlined /> {formatCount(blog.likeCount)}
            </span>
            <span title={t('blog.comments')}>
              <MessageOutlined /> {formatCount(blog.commentCount)}
            </span>
            <span title={t('blog.favorites')}>
              <StarOutlined /> {formatCount(blog.favoriteCount)}
            </span>
            <span className="blog-card__date">{formatDate(blog.publishedAt || blog.createdAt, 'MM-DD')}</span>
            <span className="blog-card__read">{t('blog.readTime', { minutes: readMinutes(blog.wordCount) })}</span>
          </Space>
        </div>

        {statusTag && (
          <div className="blog-card__status-row">
            <Tag color={blog.status === 'draft' ? 'default' : 'warning'}>{statusTag}</Tag>
          </div>
        )}
      </div>
    </article>
  );
}
