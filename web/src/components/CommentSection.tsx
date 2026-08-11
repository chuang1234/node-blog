/**
 * 评论区组件
 * 支持：分页列表、按情感/时间排序、发表评论、嵌套回复、点赞、举报，
 * 以及「AI 帮我回复」（调 /ai/reply 生成草稿后由用户编辑发送）。
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Button,
  Input,
  Space,
  Tag,
  Select,
  Modal,
  Empty,
  Spin,
  message as antdMessage,
  Popconfirm,
} from 'antd';
import {
  LikeOutlined,
  LikeFilled,
  MessageOutlined,
  FlagOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { commentApi, aiApi } from '@/api';
import type { Comment, Sentiment } from '@/types';
import { useAppSelector } from '@/store';
import { getImageUrl, formatDate } from '@/utils/format';
import './CommentSection.less';

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: 'green',
  neutral: 'default',
  negative: 'red',
  unknown: 'default',
};

interface Props {
  blogId: number;
}

export default function CommentSection({ blogId }: Props) {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  const [list, setList] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const [orderBy, setOrderBy] = useState<'latest' | 'hot'>('latest');
  const [sentiment, setSentiment] = useState<Sentiment | ''>('');

  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [aiReplyTargetId, setAiReplyTargetId] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [reportTarget, setReportTarget] = useState<Comment | null>(null);
  const [reportReason, setReportReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commentApi.listByBlog(blogId, {
        pageNum,
        pageSize: 15,
        orderBy,
        sentiment,
      });
      setList(res.list);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [blogId, pageNum, orderBy, sentiment]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (parentId: number | null, content: string) => {
    const text = content.trim();
    if (text.length < 2) {
      antdMessage.warning(t('comment.placeholder'));
      return;
    }
    setSubmitting(true);
    try {
      const isAiReply = Boolean(parentId && replyTarget && replyTarget.id === aiReplyTargetId);
      await commentApi.create({ blogId, content: text, parentId, isAiReply });
      antdMessage.success(t('comment.submitSuccess'));
      setInput('');
      setReplyText('');
      setReplyTarget(null);
      setAiReplyTargetId(null);
      setPageNum(1);
      load();
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSubmitting(false);
    }
  };

  const onLike = async (c: Comment) => {
    if (!user) return;
    try {
      const res = await commentApi.toggleLike('comment', c.id);
      setList((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? { ...item, liked: res.liked, likeCount: res.likeCount }
            : {
                ...item,
                replies: item.replies?.map((r) =>
                  r.id === c.id ? { ...r, liked: res.liked, likeCount: res.likeCount } : r
                ),
              }
        )
      );
    } catch {
      /* ignore */
    }
  };

  const onAiReply = async (c: Comment) => {
    setReplyTarget({ id: c.id, name: c.userName || '' });
    setAiLoading(true);
    try {
      const res = await aiApi.reply({ comment: c.content, blogId, tone: 'friendly' });
      setReplyText(res.reply);
      setAiReplyTargetId(c.id);
      antdMessage.success(t('ai.aiReplyGenerated'));
    } catch {
      /* ignore */
    } finally {
      setAiLoading(false);
    }
  };

  const doReport = async () => {
    if (!reportTarget) return;
    try {
      await commentApi.report(reportTarget.id, reportReason);
      antdMessage.success(t('comment.reportSuccess'));
      setReportTarget(null);
      setReportReason('');
    } catch {
      /* ignore */
    }
  };

  const renderComment = (c: Comment, depth: number) => (
    <div className={`comment-item ${depth > 0 ? 'is-reply' : ''}`} key={c.id}>
      <Avatar src={getImageUrl(c.userAvatar) || undefined} size={36}>
        {c.userName?.[0]}
      </Avatar>
      <div className="comment-item__body">
        <div className="comment-item__head">
          <span className="comment-item__name">{c.userName}</span>
          {depth > 0 && c.parentId && c.rootId && c.parentId !== c.rootId && c.replyToName && (
            <span className="comment-item__reply-to">
              {t('comment.replyTo', { name: c.replyToName })}
            </span>
          )}
          {!!c.isAiReply && (
            <Tag color="purple" className="comment-item__ai">
              <RobotOutlined /> {t('comment.aiReply')}
            </Tag>
          )}
          <Tag color={SENTIMENT_COLOR[c.sentiment]} className="comment-item__sentiment">
            {t(`comment.sentiment${c.sentiment.charAt(0).toUpperCase() + c.sentiment.slice(1)}` as const)}
          </Tag>
          <span className="comment-item__time">{formatDate(c.createdAt)}</span>
        </div>
        <div className="comment-item__content">{c.content}</div>
        <div className="comment-item__actions">
          <Button
            type="text"
            size="small"
            icon={c.liked ? <LikeFilled /> : <LikeOutlined />}
            onClick={() => onLike(c)}
            disabled={!user}
          >
            {c.likeCount || ''}
          </Button>
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => {
              setReplyTarget({ id: c.id, name: c.userName || '' });
              setAiReplyTargetId(null);
            }}
            disabled={!user}
          >
            {t('comment.reply')}
          </Button>
          {user && (
            <Button
              type="text"
              size="small"
              icon={<RobotOutlined />}
              loading={aiLoading && replyTarget?.id === c.id}
              onClick={() => onAiReply(c)}
            >
              {t('ai.aiReplyGenerate')}
            </Button>
          )}
          <Popconfirm
            title={t('comment.reportTitle')}
            description={t('comment.reportPlaceholder')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            disabled={!user}
            onConfirm={() => setReportTarget(c)}
          >
            <Button type="text" size="small" icon={<FlagOutlined />} disabled={!user}>
              {t('comment.report')}
            </Button>
          </Popconfirm>
        </div>

        {replyTarget?.id === c.id && (
          <div className="comment-item__reply-box">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('comment.replyTo', { name: replyTarget.name })}
            />
            <Space style={{ marginTop: 8 }}>
              <Button
                type="primary"
                size="small"
                loading={submitting}
                onClick={() => submit(c.id, replyText)}
              >
                {t('comment.submit')}
              </Button>
              <Button size="small" onClick={() => { setReplyTarget(null); setAiReplyTargetId(null); }}>
                {t('common.cancel')}
              </Button>
            </Space>
          </div>
        )}

        {c.replies && c.replies.length > 0 && (
          <div className="comment-item__replies">
            {c.replies.map((r) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="comment-section">
      <div className="comment-section__head">
        <h2 className="comment-section__title">{t('comment.title')}</h2>
        <Space wrap>
          <Select
            size="small"
            value={sentiment}
            style={{ width: 130 }}
            onChange={(v) => {
              setSentiment(v);
              setPageNum(1);
            }}
            options={[
              { value: '', label: t('common.all') },
              { value: 'positive', label: t('comment.sentimentPositive') },
              { value: 'neutral', label: t('comment.sentimentNeutral') },
              { value: 'negative', label: t('comment.sentimentNegative') },
            ]}
          />
          <Select
            size="small"
            value={orderBy}
            style={{ width: 110 }}
            onChange={(v) => {
              setOrderBy(v);
              setPageNum(1);
            }}
            options={[
              { value: 'latest', label: t('comment.sortLatest') },
              { value: 'hot', label: t('comment.sortHot') },
            ]}
          />
        </Space>
      </div>

      {user ? (
        <div className="comment-section__editor">
          <Avatar src={getImageUrl(user.avatar) || undefined} size={36}>
            {user.nickname?.[0]}
          </Avatar>
          <div className="comment-section__editor-body">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 5 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('comment.placeholder')}
            />
            <Button
              type="primary"
              size="small"
              className="comment-section__send"
              loading={submitting}
              onClick={() => submit(null, input)}
            >
              {t('comment.submit')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="comment-section__login-tip">{t('comment.loginToComment')}</div>
      )}

      <Spin spinning={loading}>
        {list.length === 0 && !loading ? (
          <Empty description={t('comment.empty')} style={{ padding: '32px 0' }} />
        ) : (
          <div className="comment-section__list">
            {list.map((c) => renderComment(c, 0))}
          </div>
        )}
      </Spin>

      {total > 15 && (
        <div className="comment-section__pager">
          <Button onClick={() => setPageNum((p) => p + 1)}>{t('common.more')}</Button>
        </div>
      )}

      <Modal
        open={Boolean(reportTarget)}
        title={t('comment.reportTitle')}
        onCancel={() => setReportTarget(null)}
        onOk={doReport}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Input.TextArea
          rows={3}
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder={t('comment.reportPlaceholder')}
        />
      </Modal>
    </section>
  );
}
