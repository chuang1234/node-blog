/**
 * 顶栏通知抽屉
 * 点击铃铛弹出，展示最近通知，支持标记已读/全部已读、点击跳转。
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer, List, Button, Empty, Spin } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useAppDispatch } from '@/store';
import { fetchUnread } from '@/store/notificationSlice';
import { notificationApi } from '@/api/notification';
import UserLink from '@/components/UserLink';
import { formatDate } from '@/utils/format';
import type { Notification } from '@/types';
import './NotificationDrawer.less';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await notificationApi.list({ pageSize: 12 });
      setList(res.list);
      dispatch(fetchUnread());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [open]);

  const onItemClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
      } catch {
        /* 忽略 */
      }
      dispatch(fetchUnread());
    }
    onClose();
    if (n.blogId) navigate(`/blog/${n.blogId}`);
    else navigate(`/user/${n.actorId}`);
  };

  const onMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
    } catch {
      /* 忽略 */
    }
    dispatch(fetchUnread());
    setList((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
  };

  return (
    <Drawer
      title={t('notification.title')}
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
      extra={
        <Button type="link" icon={<CheckOutlined />} onClick={onMarkAll}>
          {t('notification.markAllRead')}
        </Button>
      }
    >
      {loading ? (
        <div className="notif-drawer__loading">
          <Spin />
        </div>
      ) : list.length === 0 ? (
        <Empty description={t('notification.empty')} />
      ) : (
        <List
          className="notif-drawer__list"
          dataSource={list}
          renderItem={(n) => (
            <List.Item
              className={`notif-drawer__item${n.isRead ? '' : ' is-unread'}`}
              onClick={() => onItemClick(n)}
            >
              <div className="notif-drawer__row">
                <UserLink userId={n.actorId} name={n.actorName} avatar={n.actorAvatar} size={36} showName={false} />
                <div className="notif-drawer__body">
                  <div className="notif-drawer__text">
                    <span className="notif-drawer__name">{n.actorName}</span>
                    <span>{t(`notification.type.${n.type}`)}</span>
                    {n.blogTitle && <span className="notif-drawer__blog">《{n.blogTitle}》</span>}
                  </div>
                  <div className="notif-drawer__time">{formatDate(n.createdAt, 'MM-DD HH:mm')}</div>
                </div>
                {!n.isRead && <span className="notif-drawer__dot" />}
              </div>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
