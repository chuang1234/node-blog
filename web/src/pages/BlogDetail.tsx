/**
 * 文章详情页
 * 展示正文（Markdown 渲染）、作者信息、点赞/收藏/分享、相关推荐，并嵌入评论区。
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Space,
  Tag,
  Divider,
  Tooltip,
  message as antdMessage,
  Skeleton,
  Result,
} from 'antd';
import {
  LikeOutlined,
  LikeFilled,
  StarOutlined,
  StarFilled,
  ShareAltOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { blogApi, commentApi } from '@/api';
import type { Blog } from '@/types';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import SmartImage from '@/components/SmartImage';
import BlogCard from '@/components/BlogCard';
import CommentSection from '@/components/CommentSection';
import UserLink from '@/components/UserLink';
import { formatCount, formatDate, readMinutes } from '@/utils/format';
import './BlogDetail.less';

export default function BlogDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const requireLogin = useRequireLogin();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [related, setRelated] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const blogId = Number(id);

  useEffect(() => {
    if (!blogId) return;
    setLoading(true);
    setNotFound(false);
    blogApi
      .detail(blogId)
      .then((res) => {
        setBlog(res);
        setLiked(Boolean(res.liked));
        setFavorited(Boolean(res.favorited));
        setLikeCount(res.likeCount);
        setFavoriteCount(res.favoriteCount);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    blogApi.related(blogId).then(setRelated).catch(() => setRelated([]));
  }, [blogId]);

  const onLike = async () => {
    if (!requireLogin()) return;
    try {
      const res = await commentApi.toggleLike('blog', blogId);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      /* 拦截器已提示 */
    }
  };

  const onFavorite = async () => {
    if (!requireLogin()) return;
    try {
      const res = await commentApi.toggleFavorite(blogId);
      setFavorited(res.favorited);
      setFavoriteCount(res.favoriteCount);
    } catch {
      /* 拦截器已提示 */
    }
  };

  const onShare = () => {
    const url = `${location.origin}/blog/${blogId}`;
    navigator.clipboard?.writeText(url);
    antdMessage.success(t('blog.shareCopied'));
  };

  if (loading) {
    return (
      <div className="blog-detail container">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="blog-detail container">
        <Result status="404" title={t('blog.notFound')} />
      </div>
    );
  }

  return (
    <div className="blog-detail container">
      <div className="blog-detail__main">
        <article className="blog-detail__article">
          <h1 className="blog-detail__title">{blog.title}</h1>

          <div className="blog-detail__meta">
            <Space size={10} wrap>
              <UserLink
                userId={blog.userId}
                name={blog.authorName}
                avatar={blog.authorAvatar}
                size={28}
                className="blog-detail__author"
              />
              <span className="blog-detail__meta-item">
                <CalendarOutlined /> {formatDate(blog.publishedAt || blog.createdAt, 'YYYY-MM-DD')}
              </span>
              <span className="blog-detail__meta-item">
                <EyeOutlined /> {formatCount(blog.viewCount)}
              </span>
              <span className="blog-detail__meta-item">
                {t('blog.readTime', { minutes: readMinutes(blog.wordCount) })}
              </span>
              {blog.isTop && (
                <Tag color="blue">
                  <VerticalAlignTopOutlined /> {t('blog.topPost')}
                </Tag>
              )}
              {blog.isAiAssisted && (
                <Tag color="purple">
                  <ThunderboltOutlined /> {t('blog.aiAssisted')}
                </Tag>
              )}
            </Space>
          </div>

          <div className="blog-detail__cover">
            <SmartImage src={blog.cover} alt={blog.title} type="cover" />
          </div>

          <MarkdownRenderer content={blog.content || ''} />

          <div className="blog-detail__tags">
            {blog.tags?.map((tag) => (
              <Tag key={tag.id} color={tag.color || 'blue'} bordered={false}>
                #{tag.name}
              </Tag>
            ))}
          </div>

          <Divider />

          <div className="blog-detail__actions">
            <Button
              icon={liked ? <LikeFilled /> : <LikeOutlined />}
              onClick={onLike}
              type={liked ? 'primary' : 'default'}
            >
              {formatCount(likeCount)}
            </Button>
            <Button
              icon={favorited ? <StarFilled /> : <StarOutlined />}
              onClick={onFavorite}
              type={favorited ? 'primary' : 'default'}
              danger={favorited}
            >
              {formatCount(favoriteCount)}
            </Button>
            <Tooltip title={t('blog.share')}>
              <Button icon={<ShareAltOutlined />} onClick={onShare}>
                {t('blog.share')}
              </Button>
            </Tooltip>
          </div>
        </article>

        <CommentSection blogId={blogId} />
      </div>

      {related.length > 0 && (
        <aside className="blog-detail__side">
          <h3 className="blog-detail__side-title">{t('blog.relatedPosts')}</h3>
          <div className="blog-detail__related">
            {related.map((b) => (
              <BlogCard key={b.id} blog={b} showAuthor={false} />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
