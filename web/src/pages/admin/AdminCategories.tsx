/**
 * 分类与标签管理
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Tabs,
  Table,
  Space,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message as antdMessage,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { categoryApi } from '@/api';
import type { Category, Tag as TagType } from '@/types';
import { formatCount } from '@/utils/format';
import './admin.less';

export default function AdminCategories() {
  const { t } = useTranslation();

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.categories')}</h2>
      </div>
      <Card className="admin-card">
        <Tabs
          defaultActiveKey="categories"
          items={[
            { key: 'categories', label: t('admin.categories'), children: <CategoryTab /> },
            { key: 'tags', label: t('blog.tags'), children: <TagTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

function CategoryTab() {
  const { t } = useTranslation();
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    categoryApi
      .listCategories()
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    form.setFieldsValue(c);
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await categoryApi.updateCategory(editing.id, values);
      } else {
        await categoryApi.createCategory(values);
      }
      antdMessage.success(t('common.success'));
      setOpen(false);
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await categoryApi.removeCategory(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<Category> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: t('admin.categoryName'), dataIndex: 'name' },
    { title: 'Slug', dataIndex: 'slug', render: (v) => v || '-' },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    { title: t('admin.blogCount'), dataIndex: 'blogCount', width: 100, render: (v) => formatCount(v) },
    { title: t('common.action'), width: 160, render: (_, r) => (
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
    ) },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ marginBottom: 12 }}>
        {t('admin.categoryAdd')}
      </Button>
      <Spin spinning={loading}>
        <Table rowKey="id" columns={columns} dataSource={data} pagination={false} />
      </Spin>
      <Modal
        open={open}
        title={editing ? t('common.edit') : t('admin.categoryAdd')}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('admin.categoryName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="auto" />
          </Form.Item>
          <Form.Item name="description" label={t('blog.summary')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="icon" label="Icon">
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function TagTab() {
  const { t } = useTranslation();
  const [data, setData] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1677ff');

  const load = () => {
    setLoading(true);
    categoryApi
      .adminTagPage({ pageNum: 1, pageSize: 50 })
      .then((res) => setData(res.list))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await categoryApi.createTag({ name: name.trim(), color });
      antdMessage.success(t('common.success'));
      setName('');
      load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    try {
      await categoryApi.removeTag(id);
      antdMessage.success(t('common.success'));
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder={t('admin.tagName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 180 }}
        />
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 60 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={add}>
          {t('admin.tagAdd')}
        </Button>
      </Space>
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {data.map((tag) => (
            <Tag
              key={tag.id}
              color={tag.color}
              closable
              onClose={() => remove(tag.id)}
              style={{ fontSize: 14, padding: '4px 10px' }}
            >
              #{tag.name} {tag.refCount ? `(${tag.refCount})` : ''}
            </Tag>
          ))}
        </div>
      </Spin>
    </div>
  );
}
