/**
 * 评论管理
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Space, Tag, Button, Input, Select, Popconfirm, message as antdMessage, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { commentApi } from '@/api';
import type { Comment, CommentStatus, Sentiment } from '@/types';
import { formatDate } from '@/utils/format';
import './admin.less';

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: 'green',
  neutral: 'default',
  negative: 'red',
  unknown: 'default',
};

export default function AdminComments() {
  const { t } = useTranslation();
  const [data, setData] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | ''>('');
  const [status, setStatus] = useState<CommentStatus | ''>('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commentApi.adminList({
        pageNum,
        pageSize: 10,
        keyword: keyword || undefined,
        sentiment,
        status,
      });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum, keyword, sentiment, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: number, s: CommentStatus) => {
    try {
      await commentApi.adminUpdateStatus(id, s);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await commentApi.adminRemove(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<Comment> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: t('blog.author'), dataIndex: 'userName', width: 120 },
    {
      title: t('blog.title'),
      dataIndex: 'blogTitle',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: t('comment.title'),
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => v,
    },
    {
      title: t('comment.sortHot'),
      dataIndex: 'sentiment',
      width: 100,
      render: (s: Sentiment) => (
        <Tag color={SENTIMENT_COLOR[s]}>{t(`comment.sentiment${s.charAt(0).toUpperCase() + s.slice(1)}` as const)}</Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 100,
      render: (s: CommentStatus) => (
        <Tag color={s === 'normal' ? 'success' : s === 'hidden' ? 'warning' : 'default'}>
          {s === 'normal'
            ? t('admin.commentStatusNormal')
            : s === 'hidden'
            ? t('admin.commentStatusHidden')
            : t('admin.commentStatusPending')}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD'),
    },
    {
      title: t('common.action'),
      width: 180,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'normal' ? (
            <Button size="small" onClick={() => updateStatus(r.id, 'hidden')}>
              {t('admin.hide')}
            </Button>
          ) : (
            <Button size="small" type="primary" ghost onClick={() => updateStatus(r.id, 'normal')}>
              {t('admin.restore')}
            </Button>
          )}
          <Popconfirm
            title={t('comment.deleteConfirm')}
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
        <h2 className="admin-page__title">{t('admin.comments')}</h2>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('common.search')}
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPageNum(1);
              load();
            }}
          />
          <Select
            allowClear
            placeholder={t('comment.filterBySentiment')}
            style={{ width: 140 }}
            value={sentiment || undefined}
            onChange={(v) => {
              setSentiment(v || '');
              setPageNum(1);
            }}
            options={[
              { value: 'positive', label: t('comment.sentimentPositive') },
              { value: 'neutral', label: t('comment.sentimentNeutral') },
              { value: 'negative', label: t('comment.sentimentNegative') },
            ]}
          />
          <Select
            allowClear
            placeholder={t('common.status')}
            style={{ width: 120 }}
            value={status || undefined}
            onChange={(v) => {
              setStatus(v || '');
              setPageNum(1);
            }}
            options={[
              { value: 'normal', label: t('admin.commentStatusNormal') },
              { value: 'hidden', label: t('admin.commentStatusHidden') },
              { value: 'pending', label: t('admin.commentStatusPending') },
            ]}
          />
        </Space>
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
