/**
 * 文章管理
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Space, Tag, Button, Input, Popconfirm, message as antdMessage, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import { blogApi } from '@/api';
import type { Blog, BlogStatus } from '@/types';
import { formatCount, formatDate } from '@/utils/format';
import './admin.less';

export default function AdminBlogs() {
  const { t } = useTranslation();
  const [data, setData] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogApi.adminList({ pageNum, pageSize: 10, keyword: keyword || undefined });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const setTop = async (id: number, isTop: boolean) => {
    try {
      await blogApi.adminSetTop(id, isTop);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const changeStatus = async (id: number, status: BlogStatus) => {
    try {
      await blogApi.adminChangeStatus(id, status);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await blogApi.adminRemove(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<Blog> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: t('blog.title'),
      dataIndex: 'title',
      render: (v: string, r) => <a href={`/blog/${r.id}`}>{v}</a>,
    },
    { title: t('blog.author'), dataIndex: 'authorName', width: 120 },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 100,
      render: (s: BlogStatus) => (
        <Tag color={s === 'published' ? 'success' : s === 'draft' ? 'default' : 'warning'}>
          {t(`blog.${s}`)}
        </Tag>
      ),
    },
    {
      title: t('blog.topPost'),
      dataIndex: 'isTop',
      width: 90,
      render: (v: number | boolean) => (
        <Tag color={v ? 'blue' : 'default'}>{v ? t('common.yes') : t('common.no')}</Tag>
      ),
    },
    { title: t('blog.views'), dataIndex: 'viewCount', width: 90, render: (v) => formatCount(v) },
    {
      title: t('common.updatedAt'),
      dataIndex: 'updatedAt',
      width: 120,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD'),
    },
    {
      title: t('common.action'),
      width: 240,
      render: (_, r) => (
        <Space size={4} wrap>
          <Button
            size="small"
            icon={<VerticalAlignTopOutlined />}
            onClick={() => setTop(r.id, !r.isTop)}
          >
            {r.isTop ? t('admin.cancelTop') : t('admin.setTop')}
          </Button>
          {r.status === 'published' ? (
            <Button size="small" onClick={() => changeStatus(r.id, 'offline')}>
              {t('admin.offline')}
            </Button>
          ) : (
            <Button size="small" type="primary" ghost onClick={() => changeStatus(r.id, 'published')}>
              {t('admin.online')}
            </Button>
          )}
          <Popconfirm
            title={t('blog.deleteConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => remove(r.id)}
          >
            <Button size="small" danger>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.blogs')}</h2>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('common.search')}
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => {
            setPageNum(1);
            load();
          }}
        />
      </div>
      <Card className="admin-card">
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={{
              current: pageNum,
              total,
              pageSize: 10,
              showSizeChanger: false,
              onChange: setPageNum,
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}
