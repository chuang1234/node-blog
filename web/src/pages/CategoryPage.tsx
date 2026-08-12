/**
 * 分类页
 * - 列表态 /category：展示全部分类卡片
 * - 详情态 /category/:slug：展示该分类下文章（分页 + 排序）
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spin, Empty, Pagination, Segmented, Card, Result } from 'antd';
import {
  FolderOutlined,
  CodeOutlined,
  BulbOutlined,
  RobotOutlined,
  CoffeeOutlined,
  RiseOutlined,
  AppstoreOutlined,
  BookOutlined,
  FireOutlined,
  StarOutlined,
  HeartOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  LaptopOutlined,
  MobileOutlined,
  DatabaseOutlined,
  CloudOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { categoryApi, blogApi } from '@/api';
import type { Blog, Category } from '@/types';
import BlogCard from '@/components/BlogCard';
import { pageTitle } from '@/utils/format';
import './CategoryPage.less';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CodeOutlined,
  BulbOutlined,
  RobotOutlined,
  CoffeeOutlined,
  RiseOutlined,
  AppstoreOutlined,
  BookOutlined,
  FireOutlined,
  StarOutlined,
  HeartOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  LaptopOutlined,
  MobileOutlined,
  DatabaseOutlined,
  CloudOutlined,
  SafetyOutlined,
  ToolOutlined,
};

function CategoryIcon({ name }: { name?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name] || FolderOutlined;
  return <Icon className="taxonomy__icon" />;
}

type OrderBy = 'latest' | 'hot' | 'comment';

export default function CategoryPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageNum = Number(searchParams.get('pageNum') || '1');
  const orderBy = (searchParams.get('orderBy') as OrderBy) || 'latest';
  const isListMode = !slug;

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [list, setList] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [notFound, setNotFound] = useState(false);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
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
      const cat = await categoryApi.getBySlug(slug as string);
      setCategory(cat);
      document.title = pageTitle(cat.name);
      const res = await blogApi.list({
        categoryId: cat.id,
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
  }, [slug, orderBy, pageNum]);

  const fetchAll = useCallback(async () => {
    setListLoading(true);
    try {
      const cats = await categoryApi.listCategories();
      setAllCategories(cats);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isListMode) {
      fetchAll();
      document.title = pageTitle(t('taxonomy.allCategories'));
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
          <Link to="/category" className="ant-btn ant-btn-primary">
            {t('taxonomy.backToList')}
          </Link>
        }
      />
    );
  }

  if (isListMode) {
    return (
      <div className="taxonomy container">
        <h1 className="taxonomy__title">
          <FolderOutlined /> {t('taxonomy.allCategories')}
        </h1>
        <Spin spinning={listLoading}>
          {allCategories.length === 0 ? (
            <Empty description={t('common.empty')} style={{ padding: 60 }} />
          ) : (
            <div className="taxonomy__grid">
              {allCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${encodeURIComponent(c.slug)}`}
                  className="taxonomy__card"
                >
                  <Card hoverable>
                    <div className="taxonomy__card-name">
                      {c.icon && <CategoryIcon name={c.icon} />}
                      {c.name}
                    </div>
                    {c.description && <div className="taxonomy__card-desc">{c.description}</div>}
                    <div className="taxonomy__card-count">
                      {t('taxonomy.postsCount', { count: c.blogCount || 0 })}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Spin>
      </div>
    );
  }

  return (
    <div className="taxonomy container">
      <div className="taxonomy__header">
        <h1 className="taxonomy__title">
          <FolderOutlined /> {category?.name}
        </h1>
        {category?.description && <p className="taxonomy__desc">{category.description}</p>}
        <div className="taxonomy__meta">{t('taxonomy.postsCount', { count: total })}</div>
      </div>

      <div className="taxonomy__bar">
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
          <Empty description={t('taxonomy.emptyCategory')} style={{ padding: '60px 0' }} />
        ) : (
          <div className="taxonomy__grid taxonomy__grid--blogs">
            {list.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        )}
      </Spin>

      {total > 9 && (
        <div className="taxonomy__pager">
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
