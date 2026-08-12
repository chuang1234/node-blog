/**
 * 标签页
 * - 列表态 /tag：展示全部标签云
 * - 详情态 /tag/:name：展示该标签下文章（分页 + 排序）
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spin, Empty, Pagination, Segmented, Tag, Result } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import { categoryApi, blogApi } from '@/api';
import type { Blog, Tag as TagType } from '@/types';
import BlogCard from '@/components/BlogCard';
import { pageTitle } from '@/utils/format';
import './TagPage.less';

type OrderBy = 'latest' | 'hot' | 'comment';

export default function TagPage() {
  const { t } = useTranslation();
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageNum = Number(searchParams.get('pageNum') || '1');
  const orderBy = (searchParams.get('orderBy') as OrderBy) || 'latest';
  const isListMode = !name;

  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<TagType | null>(null);
  const [list, setList] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [notFound, setNotFound] = useState(false);

  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    setSearchParams(next);
  };

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const tg = await categoryApi.getTagByName(name as string);
      setTag(tg);
      document.title = pageTitle(tg.name);
      const res = await blogApi.list({
        tagId: tg.id,
        orderBy,
        pageNum,
        pageSize: 9,
      });
      setList(res.list);
      setTotal(res.pagination.total);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [name, orderBy, pageNum]);

  const fetchAll = useCallback(async () => {
    setListLoading(true);
    try {
      const tags = await categoryApi.listTags();
      setAllTags(tags);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isListMode) {
      fetchAll();
      document.title = pageTitle(t('taxonomy.allTags'));
    } else {
      fetchDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListMode, fetchAll, fetchDetail]);

  if (notFound) {
    return (
      <Result
        status="404"
        title={t('taxonomy.notFound')}
        extra={
          <Link to="/tag" className="ant-btn ant-btn-primary">
            {t('taxonomy.backToList')}
          </Link>
        }
      />
    );
  }

  if (isListMode) {
    return (
      <div className="tag-page container">
        <h1 className="tag-page__title">
          <TagsOutlined /> {t('taxonomy.allTags')}
        </h1>
        <Spin spinning={listLoading}>
          {allTags.length === 0 ? (
            <Empty description={t('common.empty')} style={{ padding: 60 }} />
          ) : (
            <div className="tag-page__cloud">
              {allTags.map((tg) => (
                <Link
                  key={tg.id}
                  to={`/tag/${encodeURIComponent(tg.name)}`}
                  className="tag-page__chip"
                >
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {tg.name}
                    {typeof tg.refCount === 'number' && (
                      <span className="tag-page__count">{tg.refCount}</span>
                    )}
                  </Tag>
                </Link>
              ))}
            </div>
          )}
        </Spin>
      </div>
    );
  }

  return (
    <div className="tag-page container">
      <div className="tag-page__header">
        <h1 className="tag-page__title">
          <TagsOutlined /> {tag?.name}
        </h1>
        <div className="tag-page__meta">{t('taxonomy.postsCount', { count: total })}</div>
      </div>

      <div className="tag-page__bar">
        <Segmented
          value={orderBy}
          onChange={(v) => updateParams({ orderBy: String(v) })}
          options={[
            { value: 'latest', label: t('blog.sortLatest') },
            { value: 'hot', label: t('blog.sortHot') },
            { value: 'comment', label: t('blog.sortComment') },
          ]}
        />
      </div>

      <Spin spinning={loading}>
        {list.length === 0 && !loading ? (
          <Empty description={t('taxonomy.emptyTag')} style={{ padding: '60px 0' }} />
        ) : (
          <div className="tag-page__grid">
            {list.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        )}
      </Spin>

      {total > 9 && (
        <div className="tag-page__pager">
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
  );
}
