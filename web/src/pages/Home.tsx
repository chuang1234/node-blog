/**
 * 首页
 * 文章列表（分页 + 分类/标签/排序筛选）+ 侧边栏（热门标签、热门文章、AI 推荐）
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Select, Tag, Spin, Empty, Pagination, Card, Space, Segmented } from 'antd';
import { FireOutlined, TagsOutlined, ThunderboltOutlined, EyeOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { blogApi, categoryApi, aiApi } from '@/api';
import type { Blog, Category, Tag as TagType, BlogListQuery } from '@/types';
import BlogCard from '@/components/BlogCard';
import BlogListItem from '@/components/BlogListItem';
import SmartImage from '@/components/SmartImage';
import { formatCount } from '@/utils/format';
import './Home.less';

export default function Home() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [list, setList] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [hotBlogs, setHotBlogs] = useState<Blog[]>([]);
  const [recommend, setRecommend] = useState<Blog[]>([]);

  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const tagId = searchParams.get('tagId') || '';
  const orderBy = (searchParams.get('orderBy') as BlogListQuery['orderBy']) || 'latest';
  const pageNum = Number(searchParams.get('pageNum') || '1');

  /** 博客显示风格：卡片网格 / 每行一条列表，偏好持久化到 localStorage */
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as 'grid' | 'list') || 'grid'
  );
  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogApi.list({
        keyword: keyword || undefined,
        categoryId: categoryId || undefined,
        tagId: tagId || undefined,
        orderBy,
        pageNum,
        pageSize: 9,
      });
      setList(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, tagId, orderBy, pageNum]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    categoryApi.listCategories().then(setCategories).catch(() => undefined);
    categoryApi.listTags().then(setAllTags).catch(() => undefined);
    blogApi.hot(6).then(setHotBlogs).catch(() => undefined);
    aiApi
      .recommend(5)
      .then((r) => setRecommend(Array.isArray(r) ? r : (r as { list: Blog[] }).list))
      .catch(() => undefined);
  }, []);

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    next.delete('pageNum');
    setSearchParams(next);
  };

  return (
    <div className="home container">
      <div className="home__main">
        <div className="home__bar">
          <Space wrap>
            <Select
              value={categoryId || 'all'}
              style={{ width: 160 }}
              onChange={(v) => updateParams({ categoryId: v === 'all' ? '' : v })}
              options={[
                { value: 'all', label: t('common.all') },
                ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
            <Segmented
              value={orderBy}
              onChange={(v) => updateParams({ orderBy: String(v) })}
              options={[
                { value: 'latest', label: t('blog.sortLatest') },
                { value: 'hot', label: t('blog.sortHot') },
                { value: 'comment', label: t('blog.sortComment') },
              ]}
            />
          </Space>
          <Segmented
            className="home__view-switch"
            value={viewMode}
            onChange={(v) => changeViewMode(v as 'grid' | 'list')}
            options={[
              { value: 'grid', icon: <AppstoreOutlined />, label: t('blog.gridView') },
              { value: 'list', icon: <UnorderedListOutlined />, label: t('blog.listView') },
            ]}
          />
          {keyword && <span className="home__keyword">“{keyword}”</span>}
        </div>

        {allTags.length > 0 && (
          <div className="home__tags">
            <TagsOutlined /> 
            {(tagsExpanded ? allTags : allTags.slice(0, TAG_COLLAPSED)).map((tag) => (
              <Tag
                key={tag.id}
                color={tag.color || 'blue'}
                bordered={false}
                className={tagId === String(tag.id) ? 'is-active' : ''}
                onClick={() => updateParams({ tagId: tagId === String(tag.id) ? '' : String(tag.id) })}
                style={{ cursor: 'pointer' }}
              >
                #{tag.name} {tag.refCount ? `(${tag.refCount})` : ''}
              </Tag>
            ))}
            {allTags.length > TAG_COLLAPSED && (
              <button
                type="button"
                className="home__tags-more"
                onClick={() => setTagsExpanded((v) => !v)}
              >
                {tagsExpanded ? t('common.collapse') : t('common.expandMore')}
              </button>
            )}
          </div>
        )}

        <Spin spinning={loading}>
          {list.length === 0 && !loading ? (
            <Empty description={t('blog.emptyList')} style={{ padding: '60px 0' }} />
          ) : (
            <div className={viewMode === 'grid' ? 'home__grid' : 'home__list'}>
              {list.map((blog) =>
                viewMode === 'grid' ? (
                  <BlogCard key={blog.id} blog={blog} />
                ) : (
                  <BlogListItem key={blog.id} blog={blog} />
                )
              )}
            </div>
          )}
        </Spin>

        {total > 9 && (
          <div className="home__pager">
            <Pagination
              current={pageNum}
              total={total}
              pageSize={9}
              onChange={(p) => updateParams({ pageNum: String(p) })}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      <aside className="home__side">
        <Card
          size="small"
          title={
            <span>
              <ThunderboltOutlined style={{ color: 'var(--c-primary)' }} /> {t('ai.recommend')}
            </span>
          }
          className="home__card"
        >
          {recommend.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.empty')} />
          ) : (
            <ul className="home__rank">
              {recommend.map((b, i) => (
                <li key={b.id}>
                  <span className="home__rank-no">{i + 1}</span>
                  <a href={`/blog/${b.id}`}>{b.title}</a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          size="small"
          title={
            <span>
              <FireOutlined style={{ color: '#fa541c' }} /> {t('blog.hotPosts')}
            </span>
          }
          className="home__card"
        >
          {hotBlogs.map((b, i) => (
            <div className="home__hot" key={b.id}>
              <span className="home__hot-no">{i + 1}</span>
              <SmartImage src={b.cover} alt={b.title} type="cover" className="home__hot-cover" />
              <div className="home__hot-body">
                <a href={`/blog/${b.id}`} className="home__hot-title">
                  {b.title}
                </a>
                <span className="home__hot-meta">
                  <EyeOutlined /> {formatCount(b.viewCount)}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </aside>
    </div>
  );
}

/** 标签云收起时最多展示的标签数量 */
const TAG_COLLAPSED = 12;

/** 博客显示风格偏好持久化键 */
const VIEW_MODE_KEY = 'blog_view_mode';
