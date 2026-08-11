/**
 * AI 参数配置
 * 读取全部 AI 配置项，按类型渲染可编辑控件，批量保存后立即生效。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Spin, Button, Input, InputNumber, Switch, Space, message as antdMessage, Popconfirm } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { adminApi } from '@/api';
import type { AiConfigItem } from '@/types';
import './admin.less';

type Editable = AiConfigItem & { value: string | number | boolean };

export default function AdminAiConfig() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Editable[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .aiConfigList()
      .then((list) =>
        setItems(
          list.map((it) => ({
            ...it,
            value:
              it.valueType === 'number'
                ? Number(it.configValue)
                :               it.valueType === 'boolean'
                ? it.configValue === 'true'
                : it.configValue,
          }))
        )
      )
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key: string, value: string | number | boolean) => {
    setItems((prev) => prev.map((it) => (it.configKey === key ? { ...it, value } : it)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = items.map((it) => ({ configKey: it.configKey, configValue: it.value }));
      await adminApi.aiConfigSave(payload);
      antdMessage.success(t('admin.configSaveSuccess'));
      setDirty(false);
      load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.aiConfig')}</h2>
        <Space>
          <Popconfirm
            title={t('admin.configResetConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            disabled={!dirty}
            onConfirm={load}
          >
            <Button disabled={!dirty}>{t('common.reset')}</Button>
          </Popconfirm>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={save}>
            {t('common.save')}
          </Button>
        </Space>
      </div>
      <Card className="admin-card">
        <Spin spinning={loading}>
          <div className="ai-config">
            {items.map((it) => (
              <div className="ai-config__row" key={it.configKey}>
                <div className="ai-config__meta">
                  <div className="ai-config__key">{it.configKey}</div>
                  <div className="ai-config__desc">{it.description}</div>
                </div>
                <div className="ai-config__control">
                  {it.valueType === 'boolean' ? (
                    <Switch checked={Boolean(it.value)} onChange={(v) => update(it.configKey, v)} />
                  ) : it.valueType === 'number' ? (
                    <InputNumber
                      value={Number(it.value)}
                      onChange={(v) => update(it.configKey, v ?? 0)}
                    />
                  ) : (
                    <Input value={String(it.value)} onChange={(e) => update(it.configKey, e.target.value)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Spin>
      </Card>
    </div>
  );
}
