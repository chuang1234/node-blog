/**
 * 搜索结果页
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Spin, Empty, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { blogApi } from '@/api';
import type { Blog } from '@/types';
import BlogCard from '@/components/BlogCard';
import './Search.less';

export default function Search() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';

  const [list, setList] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);

  const fetchData = useCallback(async () => {
    if (!keyword.trim()) {
      setList([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await blogApi.list({ keyword: keyword.trim(), pageNum, pageSize: 9 });
      setList(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [keyword, pageNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSearch = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v.trim()) next.set('keyword', v.trim());
    else next.delete('keyword');
    next.delete('pageNum');
    setPageNum(1);
    setSearchParams(next);
  };

  return (
    <div className="search container">
      <div className="search__bar">
        <Input.Search
          size="large"
          allowClear
          enterButton
          prefix={<SearchOutlined />}
          placeholder={t('nav.searchPlaceholder')}
          defaultValue={keyword}
          onSearch={onSearch}
        />
        {keyword && (
          <div className="search__count">
            {t('common.total', { count: total })}
          </div>
        )}
      </div>

      <Spin spinning={loading}>
        {keyword && list.length === 0 && !loading ? (
          <Empty description={t('common.empty')} style={{ padding: '60px 0' }} />
        ) : (
          <div className="search__grid">
            {list.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        )}
      </Spin>

      {total > 9 && (
        <div className="search__pager">
          <Pagination
            current={pageNum}
            total={total}
            pageSize={9}
            showSizeChanger={false}
            onChange={setPageNum}
          />
        </div>
      )}
    </div>
  );
}
