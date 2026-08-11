/**
 * 敏感词库管理
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Select,
  Switch,
  Modal,
  Form,
  Popconfirm,
  message as antdMessage,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { adminApi } from '@/api';
import type { SensitiveWord } from '@/types';
import { formatDate } from '@/utils/format';
import './admin.less';

const CATEGORY_COLOR: Record<string, string> = {
  politics: 'red',
  porn: 'magenta',
  ad: 'orange',
  abuse: 'volcano',
  other: 'default',
};

export default function AdminWords() {
  const { t } = useTranslation();
  const [data, setData] = useState<SensitiveWord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SensitiveWord | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.wordList({
        pageNum,
        pageSize: 10,
        keyword: keyword || undefined,
        category: category || undefined,
      });
      setData(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [pageNum, keyword, category]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ level: 2, category: 'other' });
    setOpen(true);
  };

  const openEdit = (w: SensitiveWord) => {
    setEditing(w);
    form.setFieldsValue(w);
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await adminApi.wordUpdate(editing.id, values);
      } else {
        await adminApi.wordCreate(values);
      }
      antdMessage.success(t('common.success'));
      setOpen(false);
      load();
    } catch {
      /* ignore */
    }
  };

  const update = async (id: number, patch: { enabled?: boolean; level?: number; category?: string }) => {
    try {
      await adminApi.wordUpdate(id, patch);
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await adminApi.wordRemove(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<SensitiveWord> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: t('admin.word'), dataIndex: 'word', render: (v: string) => <b>{v}</b> },
    {
      title: t('admin.wordCategory'),
      dataIndex: 'category',
      width: 120,
      render: (c: string) => <Tag color={CATEGORY_COLOR[c] || 'default'}>{t(`admin.wordCat${c.charAt(0).toUpperCase() + c.slice(1)}` as const)}</Tag>,
    },
    {
      title: t('admin.wordLevel'),
      dataIndex: 'level',
      width: 140,
      render: (l: number) => (
        <Tag color={l === 3 ? 'red' : l === 2 ? 'orange' : 'default'}>
          {t(`admin.wordLevel${l}` as const)}
        </Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'enabled',
      width: 90,
      render: (v: number | boolean, r) => (
        <Switch
          checked={Boolean(v)}
          onChange={(checked) => update(r.id, { enabled: checked })}
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
      width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" onClick={() => openEdit(r)}>{t('common.edit')}</Button>
          <Popconfirm
            title={t('common.delete') + '?'}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => remove(r.id)}
          >
            <Button size="small" danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.sensitiveWords')}</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {t('admin.wordAdd')}
        </Button>
      </div>
      <Card className="admin-card">
        <Space wrap style={{ marginBottom: 12 }}>
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
            placeholder={t('admin.wordCategory')}
            style={{ width: 140 }}
            value={category || undefined}
            onChange={(v) => {
              setCategory(v || '');
              setPageNum(1);
            }}
            options={[
              { value: 'politics', label: t('admin.wordCatPolitics') },
              { value: 'porn', label: t('admin.wordCatPorn') },
              { value: 'ad', label: t('admin.wordCatAd') },
              { value: 'abuse', label: t('admin.wordCatAbuse') },
              { value: 'other', label: t('admin.wordCatOther') },
            ]}
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

      <Modal
        open={open}
        title={editing ? t('common.edit') : t('admin.wordAdd')}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="word" label={t('admin.word')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label={t('admin.wordCategory')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'politics', label: t('admin.wordCatPolitics') },
                { value: 'porn', label: t('admin.wordCatPorn') },
                { value: 'ad', label: t('admin.wordCatAd') },
                { value: 'abuse', label: t('admin.wordCatAbuse') },
                { value: 'other', label: t('admin.wordCatOther') },
              ]}
            />
          </Form.Item>
          <Form.Item name="level" label={t('admin.wordLevel')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: t('admin.wordLevel1') },
                { value: 2, label: t('admin.wordLevel2') },
                { value: 3, label: t('admin.wordLevel3') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
