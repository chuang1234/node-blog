/**
 * 举报处理
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Space, Tag, Button, message as antdMessage, Spin, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { commentApi } from '@/api';
import type { Report } from '@/types';
import { formatDate } from '@/utils/format';
import './admin.less';

export default function AdminReports() {
  const { t } = useTranslation();
  const [data, setData] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commentApi.adminReportList({ pageNum, pageSize: 10 });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum]);

  useEffect(() => {
    load();
  }, [load]);

  const handle = async (id: number, status: 'resolved' | 'ignored') => {
    try {
      await commentApi.adminHandleReport(id, status);
      antdMessage.success(t('admin.reportResolved'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<Report> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: t('admin.reportReason'), dataIndex: 'reason', ellipsis: true },
    { title: t('admin.reporter'), dataIndex: 'reporterName', width: 120 },
    {
      title: t('comment.title'),
      dataIndex: 'targetContent',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'resolved' ? 'success' : s === 'ignored' ? 'default' : 'warning'}>
          {s === 'resolved' ? t('admin.resolve') : s === 'ignored' ? t('admin.ignore') : t('admin.commentStatusPending')}
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
      width: 160,
      render: (_, r) =>
        r.status === 'pending' ? (
          <Space size={4}>
            <Popconfirm
              title={t('admin.reportResolved')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => handle(r.id, 'resolved')}
            >
              <Button size="small" type="primary" ghost>
                {t('admin.resolve')}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t('admin.ignore')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => handle(r.id, 'ignored')}
            >
              <Button size="small">{t('admin.ignore')}</Button>
            </Popconfirm>
          </Space>
        ) : (
          <span style={{ color: 'var(--c-text-tertiary)' }}>-</span>
        ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.reports')}</h2>
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
