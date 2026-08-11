/**
 * AI 调用日志
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Space, Tag, Select, Spin, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { adminApi } from '@/api';
import type { AiLog } from '@/types';
import { formatDate, formatCount } from '@/utils/format';
import './admin.less';

export default function AdminAiLogs() {
  const { t } = useTranslation();
  const [data, setData] = useState<AiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [action, setAction] = useState('');
  const [status, setStatus] = useState<'success' | 'failed' | ''>('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    totalCalls: number;
    totalTokens: number;
    avgDuration: number;
    failedCount: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.aiLogList({
        pageNum,
        pageSize: 10,
        action: action || undefined,
        status: status || undefined,
        userId: userId ? Number(userId) : undefined,
      });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum, action, status, userId]);

  useEffect(() => {
    load();
    adminApi.aiLogSummary().then(setSummary).catch(() => undefined);
  }, [load]);

  const columns: ColumnsType<AiLog> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: t('admin.logAction'),
      dataIndex: 'action',
      width: 120,
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    { title: t('admin.logProvider'), dataIndex: 'provider', width: 110 },
    { title: t('admin.logTokens'), dataIndex: 'completionTokens', width: 90, render: (v) => formatCount(v) },
    {
      title: t('admin.logDuration'),
      dataIndex: 'durationMs',
      width: 100,
      render: (v: number) => `${v}ms`,
    },
    {
      title: t('blog.author'),
      dataIndex: 'userName',
      width: 110,
      render: (v: string) => v || t('common.unknown'),
    },
    {
      title: t('admin.logStatus'),
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'success' ? 'success' : 'error'}>
          {s === 'success' ? t('admin.logSuccess') : t('admin.logFailed')}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      width: 140,
      render: (v: string) => formatDate(v, 'MM-DD HH:mm'),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.aiLogs')}</h2>
      </div>

      {summary && (
        <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
          <div className="admin-stat">
            <div className="admin-stat__label">{t('admin.aiCalls')}</div>
            <div className="admin-stat__value">{formatCount(summary.totalCalls)}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__label">{t('admin.aiTokens')}</div>
            <div className="admin-stat__value">{formatCount(summary.totalTokens)}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__label">{t('admin.aiAvgDuration')}</div>
            <div className="admin-stat__value">{summary.avgDuration}ms</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat__label">{t('admin.aiFailed')}</div>
            <div className="admin-stat__value">{formatCount(summary.failedCount)}</div>
          </div>
        </div>
      )}

      <Card className="admin-card">
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder={t('admin.logAction')}
            style={{ width: 160 }}
            value={action || undefined}
            onChange={(v) => {
              setAction(v || '');
              setPageNum(1);
            }}
            options={[
              { value: 'draft', label: t('ai.draft') },
              { value: 'polish', label: t('ai.polish') },
              { value: 'summary', label: t('ai.summary') },
              { value: 'keywords', label: t('ai.keywords') },
              { value: 'moderate', label: t('ai.moderate') },
              { value: 'reply', label: t('ai.reply') },
            ]}
          />
          <Select
            allowClear
            placeholder={t('admin.logStatus')}
            style={{ width: 120 }}
            value={status || undefined}
            onChange={(v) => {
              setStatus(v || '');
              setPageNum(1);
            }}
            options={[
              { value: 'success', label: t('admin.logSuccess') },
              { value: 'failed', label: t('admin.logFailed') },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="User ID"
            style={{ width: 140 }}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onPressEnter={() => {
              setPageNum(1);
              load();
            }}
          />
        </Space>
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
