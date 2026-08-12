/**
 * 通知中心完整页
 * 分页列表、单条已读、全部已读、删除、点击跳转。
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { List, Button, Empty, Spin, Pagination, Popconfirm, message } from 'antd';
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppDispatch } from '@/store';
import { fetchUnread } from '@/store/notificationSlice';
import { notificationApi } from '@/api/notification';
import UserLink from '@/components/UserLink';
import { formatDate } from '@/utils/format';
import type { Notification } from '@/types';
import './NotificationPage.less';

const PAGE_SIZE = 15;

export default function NotificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [list, setList] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.list({ pageNum, pageSize: PAGE_SIZE });
      setList(res.list);
      setTotal(res.pagination.total);
      dispatch(fetchUnread());
    } finally {
      setLoading(false);
    }
  }, [pageNum, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onItem = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
      } catch {
        /* 忽略 */
      }
      dispatch(fetchUnread());
    }
    if (n.blogId) navigate(`/blog/${n.blogId}`);
    else navigate(`/user/${n.actorId}`);
  };

  const onMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      message.success(t('notification.allReaded'));
      dispatch(fetchUnread());
      setList((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
    } catch {
      /* 忽略 */
    }
  };

  const onRemove = async (id: number) => {
    try {
      await notificationApi.remove(id);
      dispatch(fetchUnread());
      setList((prev) => prev.filter((n) => n.id !== id));
      setTotal((v) => Math.max(0, v - 1));
    } catch {
      /* 忽略 */
    }
  };

  const hasUnread = list.some((n) => !n.isRead);

  return (
    <div className="notif-page">
      <div className="notif-page__header">
        <h1 className="notif-page__title">{t('notification.title')}</h1>
        <Button icon={<CheckOutlined />} onClick={onMarkAll} disabled={!hasUnread}>
          {t('notification.markAllRead')}
        </Button>
      </div>

      {loading ? (
        <div className="notif-page__loading">
          <Spin />
        </div>
      ) : list.length === 0 ? (
        <Empty description={t('notification.empty')} />
      ) : (
        <>
          <List
            className="notif-page__list"
            dataSource={list}
            renderItem={(n) => (
              <List.Item
                className={`notif-page__item${n.isRead ? '' : ' is-unread'}`}
                actions={[
                  <Popconfirm
                    key="del"
                    title={t('common.confirm')}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                    onConfirm={() => onRemove(n.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
                onClick={() => onItem(n)}
              >
                <div className="notif-page__row">
                  <UserLink userId={n.actorId} name={n.actorName} avatar={n.actorAvatar} size={40} showName={false} />
                  <div className="notif-page__body">
                    <div className="notif-page__text">
                      <span className="notif-page__name">{n.actorName}</span>
                      <span>{t(`notification.type.${n.type}`)}</span>
                      {n.blogTitle && <span className="notif-page__blog">《{n.blogTitle}》</span>}
                    </div>
                    <div className="notif-page__time">{formatDate(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <span className="notif-page__dot" />}
                </div>
              </List.Item>
            )}
          />
          <div className="notif-page__pager">
            <Pagination
              current={pageNum}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPageNum}
              hideOnSinglePage
            />
          </div>
        </>
      )}
    </div>
  );
}
