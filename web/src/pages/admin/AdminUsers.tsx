/**
 * 用户管理
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Space, Tag, Button, Input, Popconfirm, Switch, message as antdMessage, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { userApi } from '@/api';
import type { User } from '@/types';
import { formatDate } from '@/utils/format';
import './admin.less';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.adminList({ pageNum, pageSize: 10, keyword: keyword || undefined });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: number, patch: { status?: number; role?: string }) => {
    try {
      await userApi.adminUpdate(id, patch);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await userApi.adminRemove(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: t('auth.username'),
      dataIndex: 'username',
      render: (v: string, r) => (
        <Space>
          {r.nickname}
          <span style={{ color: 'var(--c-text-tertiary)' }}>({v})</span>
        </Space>
      ),
    },
    { title: t('auth.email'), dataIndex: 'email', ellipsis: true },
    {
      title: t('admin.role'),
      dataIndex: 'role',
      width: 120,
      render: (r: string) => (
        <Tag color={r === 'admin' ? 'purple' : 'default'}>
          {r === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
        </Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 110,
      render: (s: number, r) => (
        <Switch
          checked={s === 1}
          checkedChildren={t('admin.statusEnabled')}
          unCheckedChildren={t('admin.statusDisabled')}
          onChange={(v) => update(r.id, { status: v ? 1 : 0 })}
        />
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
          {r.role === 'admin' ? (
            <Button size="small" onClick={() => update(r.id, { role: 'user' })}>
              {t('admin.cancelAdmin')}
            </Button>
          ) : (
            <Button size="small" type="primary" ghost onClick={() => update(r.id, { role: 'admin' })}>
              {t('admin.setAdmin')}
            </Button>
          )}
          <Popconfirm
            title={t('admin.userDeleteConfirm')}
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
        <h2 className="admin-page__title">{t('admin.users')}</h2>
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
