/**
 * 个人中心
 * 四个标签页：概览、我的文章（含管理操作）、我的收藏、账号设置。
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  Card,
  Avatar,
  Descriptions,
  Button,
  Table,
  Space,
  Tag,
  Popconfirm,
  Form,
  Input,
  Select,
  Upload,
  message as antdMessage,
  Spin,
  Empty,
  Statistic,
  Divider,
  Pagination,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  KeyOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { blogApi, commentApi, userApi } from '@/api';
import type { Blog, User, BlogStatus, UpdateProfilePayload, FollowUser } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { patchUser } from '@/store/authSlice';
import BlogCard from '@/components/BlogCard';
import FollowUserItem from '@/components/FollowUserItem';
import { getImageUrl, formatCount, formatDate } from '@/utils/format';
import './Profile.less';

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user) as User | null;

  const [tab, setTab] = useState('overview');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [favorites, setFavorites] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);

  // 关注类标签数据（粉丝 / 关注，页码分页器）
  const [followItems, setFollowItems] = useState<FollowUser[]>([]);
  const [followTotal, setFollowTotal] = useState(0);
  const [followPageNum, setFollowPageNum] = useState(1);
  const [followPageSize, setFollowPageSize] = useState(20);
  const [followLoading, setFollowLoading] = useState(false);
  const followListRef = useRef<HTMLDivElement>(null);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogApi.myList({ pageNum: 1, pageSize: 20 });
      setBlogs(res.list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await commentApi.myFavorites({ pageNum: 1, pageSize: 20 });
      setFavorites(res.list);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (tab === 'blogs') loadBlogs();
    if (tab === 'favorites') loadFavorites();
  }, [tab, loadBlogs, loadFavorites]);

  const loadFollows = useCallback(
    async (type: 'followers' | 'following', page: number, size: number) => {
      if (!user) return;
      setFollowLoading(true);
      try {
        const params = { pageNum: page, pageSize: size };
        const res =
          type === 'followers'
            ? await userApi.followers(user.id, params)
            : await userApi.following(user.id, params);
        setFollowItems(res.list);
        setFollowTotal(res.pagination?.total ?? 0);
      } catch {
        /* ignore */
      } finally {
        setFollowLoading(false);
      }
    },
    [user]
  );

  // 进入粉丝 / 关注 Tab 时加载第一页
  useEffect(() => {
    if (tab === 'followers' || tab === 'following') {
      setFollowPageNum(1);
      setFollowItems([]);
      setFollowTotal(0);
      loadFollows(tab, 1, 20);
    }
  }, [tab, loadFollows]);

  const renderFollowList = () => (
    <Spin spinning={followLoading}>
      {followItems.length === 0 && !followLoading ? (
        <Empty description={t('user.empty')} style={{ padding: 40 }} />
      ) : (
        <div className="profile__follow-list" ref={followListRef}>
          {followItems.map((u) => (
            <FollowUserItem key={u.id} user={u} currentUserId={user?.id} />
          ))}
        </div>
      )}
      {followTotal > 0 && (
        <div className="profile__pagination">
          <Pagination
            current={followPageNum}
            pageSize={followPageSize}
            total={followTotal}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={[10, 20, 50]}
            showTotal={(total) => t('common.total', { count: total })}
            onChange={(page, size) => {
              setFollowPageNum(page);
              setFollowPageSize(size);
              loadFollows(tab as 'followers' | 'following', page, size);
              followListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      )}
    </Spin>
  );

  if (!user) return null;

  const removeBlog = async (id: number) => {
    try {
      await blogApi.remove(id);
      antdMessage.success(t('blog.deleteSuccess'));
      loadBlogs();
    } catch {
      /* ignore */
    }
  };

  const changeStatus = async (id: number, status: BlogStatus) => {
    try {
      await blogApi.changeStatus(id, status);
      antdMessage.success(t('common.success'));
      loadBlogs();
    } catch {
      /* ignore */
    }
  };

  const columns: ColumnsType<Blog> = [
    {
      title: t('blog.title'),
      dataIndex: 'title',
      render: (text: string, r) => <Link to={`/blog/${r.id}`}>{text}</Link>,
    },
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
    { title: t('blog.views'), dataIndex: 'viewCount', width: 90, render: (v) => formatCount(v) },
    { title: t('blog.likes'), dataIndex: 'likeCount', width: 90, render: (v) => formatCount(v) },
    {
      title: t('common.updatedAt'),
      dataIndex: 'updatedAt',
      width: 120,
      render: (v) => formatDate(v, 'YYYY-MM-DD'),
    },
    {
      title: t('common.action'),
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/edit/${r.id}`)}>
            {t('common.edit')}
          </Button>
          {r.status !== 'published' ? (
            <Button size="small" type="primary" ghost onClick={() => changeStatus(r.id, 'published')}>
              {t('blog.publish')}
            </Button>
          ) : (
            <Button size="small" onClick={() => changeStatus(r.id, 'offline')}>
              {t('blog.takeOffline')}
            </Button>
          )}
          <Popconfirm
            title={t('blog.deleteConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => removeBlog(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="profile container">
      <div className="profile__header">
        <Avatar size={72} src={getImageUrl(user.avatar) || undefined}>
          {user.nickname?.[0] || <UserOutlined />}
        </Avatar>
        <div className="profile__header-info">
          <h2>{user.nickname}</h2>
          <p>@{user.username}</p>
          {user.bio && <p className="profile__bio">{user.bio}</p>}
          <span className="profile__joined">
            {t('profile.joinedAt')} {formatDate(user.createdAt, 'YYYY-MM-DD')}
          </span>
        </div>
        <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/write')}>
          {t('nav.write')}
        </Button>
      </div>

      <Tabs activeKey={tab} onChange={setTab} className="profile__tabs">
        <Tabs.TabPane tab={t('profile.overview')} key="overview">
          <div className="profile__stats">
            <Card>
              <Statistic title={t('profile.blogCount')} value={user.blogCount || 0} />
            </Card>
            <Card className="profile__stat-clickable" onClick={() => setTab('followers')}>
              <Statistic title={t('profile.followers')} value={user.followerCount || 0} />
            </Card>
            <Card className="profile__stat-clickable" onClick={() => setTab('following')}>
              <Statistic title={t('profile.following')} value={user.followingCount || 0} />
            </Card>
            <Card>
              <Statistic title={t('profile.totalViews')} value={formatCount(user.totalViews)} />
            </Card>
            <Card>
              <Statistic title={t('profile.totalLikes')} value={formatCount(user.totalLikes)} />
            </Card>
          </div>
          <Card className="profile__overview" title={t('profile.basicInfo')}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('auth.username')}>{user.username}</Descriptions.Item>
              <Descriptions.Item label={t('auth.nickname')}>{user.nickname}</Descriptions.Item>
              <Descriptions.Item label={t('auth.email')}>{user.email}</Descriptions.Item>
              <Descriptions.Item label={t('profile.bio')}>{user.bio || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab={t('profile.myBlogs')} key="blogs">
          <Spin spinning={loading}>
            <Table rowKey="id" columns={columns} dataSource={blogs} pagination={false} />
            {blogs.length === 0 && !loading && (
              <Empty description={t('blog.emptyList')} style={{ padding: 40 }} />
            )}
          </Spin>
        </Tabs.TabPane>

        <Tabs.TabPane tab={t('profile.myFavorites')} key="favorites">
          {favorites.length === 0 ? (
            <Empty description={t('common.empty')} style={{ padding: 40 }} />
          ) : (
            <div className="profile__fav-grid">
              {favorites.map((b) => (
                <BlogCard key={b.id} blog={b} showAuthor={false} />
              ))}
            </div>
          )}
        </Tabs.TabPane>

        <Tabs.TabPane tab={t('profile.followers')} key="followers">
          {renderFollowList()}
        </Tabs.TabPane>

        <Tabs.TabPane tab={t('profile.following')} key="following">
          {renderFollowList()}
        </Tabs.TabPane>

        <Tabs.TabPane tab={t('profile.settings')} key="settings">
          <SettingsPanel user={user} onSaved={(u) => dispatch(patchUser(u))} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

/** 账号设置面板：基本资料 + 修改密码 */
function SettingsPanel({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (u: Partial<User>) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<UpdateProfilePayload>();
  const [pwdForm] = Form.useForm();
  const [avatar, setAvatar] = useState(user.avatar);
  const [saving, setSaving] = useState(false);

  const beforeUpload = (file: RcFile) => {
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
    if (!ok || file.size / 1024 / 1024 > 5) {
      antdMessage.error(t('profile.avatarTip'));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const saveProfile = async (values: UpdateProfilePayload) => {
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ ...values, avatar });
      onSaved(res);
      antdMessage.success(t('profile.updateSuccess'));
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (values: { oldPassword: string; newPassword: string }) => {
    try {
      await userApi.changePassword(values);
      antdMessage.success(t('profile.passwordSuccess'));
      pwdForm.resetFields();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="profile__settings">
      <Card title={t('profile.basicInfo')} className="profile__settings-card">
        <div className="profile__avatar-row">
          <Avatar size={64} src={getImageUrl(avatar) || undefined}>
            {user.nickname?.[0]}
          </Avatar>
          <Upload
            showUploadList={false}
            beforeUpload={beforeUpload}
            customRequest={async (options) => {
              const { file, onSuccess, onError } = options;
              try {
                const res = await userApi.uploadAvatar(file as RcFile);
                setAvatar(res.url);
                onSuccess?.(res);
              } catch (err) {
                onError?.(err as Error);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>{t('profile.uploadAvatar')}</Button>
          </Upload>
        </div>
        <Divider />
        <Form
          form={form}
          layout="vertical"
          initialValues={{ nickname: user.nickname, bio: user.bio, email: user.email, aiStyle: user.aiStyle }}
          onFinish={saveProfile}
        >
          <Form.Item name="nickname" label={t('auth.nickname')}>
            <Input placeholder={t('auth.nicknamePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('auth.email')}>
            <Input placeholder={t('auth.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="bio" label={t('profile.bio')}>
            <Input.TextArea rows={3} placeholder={t('profile.bioPlaceholder')} />
          </Form.Item>
          <Form.Item name="aiStyle" label={t('profile.aiPreference')} extra={t('profile.aiStyleTip')}>
            <Select
              options={[
                { value: 'formal', label: t('ai.styleFormal') },
                { value: 'lively', label: t('ai.styleLively') },
                { value: 'concise', label: t('ai.styleConcise') },
                { value: 'academic', label: t('ai.styleAcademic') },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={saving} htmlType="submit">
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('profile.changePassword')} className="profile__settings-card">
        <Form form={pwdForm} layout="vertical" onFinish={savePassword}>
          <Form.Item
            name="oldPassword"
            label={t('profile.oldPassword')}
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('profile.newPassword')}
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm"
            label={t('auth.confirmPassword')}
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button icon={<KeyOutlined />} htmlType="submit">
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
