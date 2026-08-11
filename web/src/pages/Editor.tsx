/**
 * 文章编辑器
 * 支持 Markdown 编辑（编辑/分屏/预览三模式）、封面上传、分类与标签、AI 快捷操作，
 * 并监听全局 AI 助手的「应用到编辑器」事件。
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Input,
  Select,
  Button,
  Upload,
  Switch,
  Space,
  Segmented,
  Modal,
  Spin,
  Tooltip,
  message as antdMessage,
  List,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  RobotOutlined,
  PictureOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { RcFile, UploadProps } from 'antd/es/upload';
import { blogApi, categoryApi, aiApi } from '@/api';
import type { Blog, Category, BlogPayload, BlogStatus } from '@/types';
import { useAppSelector } from '@/store';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { getImageUrl } from '@/utils/format';
import './Editor.less';

type EditorMode = 'edit' | 'split' | 'preview';

export default function Editor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const blogId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isAiAssisted, setIsAiAssisted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([]);
  const [mode, setMode] = useState<EditorMode>('split');
  const [uploadingImage, setUploadingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 监听全局 AI 助手「应用到编辑器」
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ field: string; value: string }>).detail;
      if (detail.field === 'content') setContent(detail.value);
      else if (detail.field === 'title') setTitle(detail.value);
      else if (detail.field === 'summary') setSummary(detail.value);
      else if (detail.field === 'keywords') {
        const incoming = detail.value
          .split(/[,，\s]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        setTags((prev) => Array.from(new Set([...prev, ...incoming])).slice(0, 10));
      }
    };
    window.addEventListener('ai-apply', handler);
    return () => window.removeEventListener('ai-apply', handler);
  }, []);

  // 预填：编辑态加载原文 / 从 AI 助手「去写作」带内容
  useEffect(() => {
    if (isEdit && blogId) {
      blogApi
        .detail(blogId)
        .then((b: Blog) => {
          setTitle(b.title);
          setSummary(b.summary);
          setContent(b.content || '');
          setCover(b.cover);
          setCategoryId(b.categoryId);
          setTags((b.tags || []).map((x) => x.name));
          setIsAiAssisted(Boolean(b.isAiAssisted));
        })
        .catch(() => antdMessage.error(t('blog.notFound')))
        .finally(() => setLoading(false));
    } else {
      const state = location.state as { content?: string } | null;
      if (state?.content) setContent(state.content);
      setLoading(false);
    }
  }, [isEdit, blogId, location.state]);

  useEffect(() => {
    categoryApi.listCategories().then(setCategories).catch(() => undefined);
    categoryApi
      .listTags()
      .then((list) => setTagOptions(list.map((t) => ({ value: t.name, label: t.name }))))
      .catch(() => undefined);
  }, []);

  const beforeUpload = (file: RcFile) => {
    const okType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
    if (!okType) {
      antdMessage.error(t('profile.avatarTip'));
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 5) {
      antdMessage.error(t('profile.avatarTip'));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadProps: UploadProps = {
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        const res = await blogApi.uploadCover(file as RcFile);
        setCover(res.url);
        onSuccess?.(res);
      } catch (err) {
        onError?.(err as Error);
      }
    },
  };

  // ---------------- 正文插图 ----------------
  /** 在光标位置插入文本片段（无焦点时追加到末尾） */
  const insertAtCursor = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        setContent((c) => c + snippet);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setContent(content.slice(0, start) + snippet + content.slice(end));
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + snippet.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [content]
  );

  /** 上传图片文件并插入 Markdown 图片语法 */
  const insertImageFile = useCallback(
    async (file: File) => {
      const okType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
      if (!okType) {
        antdMessage.error(t('editor.imageTypeTip'));
        return;
      }
      if (file.size / 1024 / 1024 > 5) {
        antdMessage.error(t('editor.imageSizeTip'));
        return;
      }
      setUploadingImage(true);
      try {
        const res = await blogApi.uploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, '');
        insertAtCursor(`\n![${alt}](${res.url})\n`);
        antdMessage.success(t('editor.imageInserted'));
      } catch {
        /* 拦截器已提示 */
      } finally {
        setUploadingImage(false);
      }
    },
    [insertAtCursor, t]
  );

  const handleInsertImageClick = () => fileInputRef.current?.click();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void insertImageFile(file);
    e.target.value = '';
  };

  /** 支持 Ctrl+V 直接粘贴剪贴板中的图片 */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData?.files;
      if (!files || !files.length) return;
      const img = Array.from(files).find((f) => f.type.startsWith('image/'));
      if (img) {
        e.preventDefault();
        void insertImageFile(img);
      }
    },
    [insertImageFile]
  );

  const submit = useCallback(
    async (status: BlogStatus) => {
      if (!title.trim()) {
        antdMessage.warning(t('blog.titlePlaceholder'));
        return;
      }
      if (status === 'published' && content.trim().length < 20) {
        antdMessage.warning(t('ai.contentTooShort'));
        return;
      }
      const payload: BlogPayload = {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        cover: cover || undefined,
        categoryId,
        tags,
        status,
        isAiAssisted,
      };
      setSaving(true);
      try {
        if (isEdit) {
          await blogApi.update(blogId, payload);
          antdMessage.success(t('blog.updateSuccess'));
        } else {
          const res = await blogApi.create(payload);
          antdMessage.success(status === 'published' ? t('blog.publishSuccess') : t('blog.saveSuccess'));
          navigate(`/blog/${res.id}`);
          return;
        }
        navigate('/profile');
      } catch {
        /* 拦截器已提示 */
      } finally {
        setSaving(false);
      }
    },
    [title, content, summary, cover, categoryId, tags, isAiAssisted, isEdit, blogId]
  );

  // ---------------- AI 快捷操作 ----------------
  const requireContent = () => {
    if (content.trim().length < 20) {
      antdMessage.warning(t('ai.contentTooShort'));
      return false;
    }
    return true;
  };

  const aiSummary = async () => {
    if (!requireContent()) return;
    try {
      const res = await aiApi.summary({ content });
      setSummary(res.summary);
      antdMessage.success(t('ai.summaryApplied'));
    } catch {
      /* ignore */
    }
  };

  const aiKeywords = async () => {
    if (!requireContent()) return;
    try {
      const res = await aiApi.keywords({ content, count: 8 });
      setTags((prev) => Array.from(new Set([...prev, ...res.keywords])).slice(0, 10));
      antdMessage.success(t('ai.keywordsApplied'));
    } catch {
      /* ignore */
    }
  };

  const [titleList, setTitleList] = useState<string[]>([]);
  const [titleModal, setKeywordTitleModal] = useState(false);
  const aiTitle = async () => {
    if (!requireContent()) return;
    try {
      const res = await aiApi.title({ content, count: 5 });
      setTitleList(res.titles);
      setKeywordTitleModal(true);
    } catch {
      /* ignore */
    }
  };

  const aiPolish = async () => {
    if (!requireContent()) return;
    try {
      const res = await aiApi.polish({ content, style: user?.aiStyle || 'lively' });
      setContent(res.content);
      setIsAiAssisted(true);
      antdMessage.success(t('ai.applied'));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="editor container">
        <div className="editor__loading">
          <Spin />
        </div>
      </div>
    );
  }

  return (
    <div className="editor container">
      <div className="editor__bar">
        <Input
          className="editor__title"
          size="large"
          placeholder={t('blog.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Space>
          <Switch
            checked={isAiAssisted}
            onChange={setIsAiAssisted}
            checkedChildren={<ThunderboltOutlined />}
            unCheckedChildren={<ThunderboltOutlined />}
          />
          <Button icon={<SaveOutlined />} loading={saving} onClick={() => submit('draft')}>
            {t('blog.saveDraft')}
          </Button>
          <Button type="primary" icon={<SendOutlined />} loading={saving} onClick={() => submit('published')}>
            {isEdit ? t('blog.update') : t('blog.publish')}
          </Button>
        </Space>
      </div>

      <div className="editor__meta">
        <Select
          placeholder={t('blog.categoryPlaceholder')}
          style={{ width: 180 }}
          value={categoryId || undefined}
          onChange={(v) => setCategoryId(v)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          allowClear
        />
        <Select
          mode="tags"
          placeholder={t('blog.tagsPlaceholder')}
          style={{ minWidth: 260, flex: 1 }}
          value={tags}
          onChange={(v) => setTags(v.slice(0, 10))}
          tokenSeparators={[',', '，']}
          options={tagOptions}
          showSearch
          optionFilterProp="label"
          maxTagCount="responsive"
        />
        <Upload {...uploadProps}>
          {cover ? (
            <img src={getImageUrl(cover)} alt="cover" className="editor__cover-thumb" />
          ) : (
            <div className="editor__cover-upload">
              <PictureOutlined />
              <div>{t('blog.cover')}</div>
            </div>
          )}
        </Upload>
      </div>

      <div className="editor__ai-bar">
        <Space wrap>
          <Tooltip title={t('ai.summaryDesc')}>
            <Button size="small" icon={<FileTextOutlined />} onClick={aiSummary}>
              {t('ai.summary')}
            </Button>
          </Tooltip>
          <Tooltip title={t('ai.optimizeTitleDesc')}>
            <Button size="small" icon={<ThunderboltOutlined />} onClick={aiTitle}>
              {t('ai.optimizeTitle')}
            </Button>
          </Tooltip>
          <Tooltip title={t('ai.keywordsDesc')}>
            <Button size="small" icon={<ThunderboltOutlined />} onClick={aiKeywords}>
              {t('ai.keywords')}
            </Button>
          </Tooltip>
          <Tooltip title={t('ai.polishDesc')}>
            <Button size="small" icon={<RobotOutlined />} onClick={aiPolish}>
              {t('ai.polish')}
            </Button>
          </Tooltip>
          <Tooltip title={t('editor.insertImageTip')}>
            <Button
              size="small"
              icon={<PictureOutlined />}
              loading={uploadingImage}
              onClick={handleInsertImageClick}
            >
              {t('editor.insertImage')}
            </Button>
          </Tooltip>
        </Space>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={handleImageSelect}
        />
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as EditorMode)}
          options={[
            { value: 'edit', label: t('blog.editorMarkdown') },
            { value: 'split', label: '分屏' },
            { value: 'preview', label: t('common.preview') },
          ]}
        />
      </div>

      <div className={`editor__panes editor__panes--${mode}`}>
          {mode !== 'preview' && (
          <textarea
            ref={textareaRef}
            className="editor__textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder={t('blog.contentPlaceholder')}
            spellCheck={false}
          />
        )}
        {mode !== 'edit' && (
          <div className="editor__preview">
            {content.trim() ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="editor__preview-empty">{t('blog.contentPlaceholder')}</div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={titleModal}
        title={t('ai.optimizeTitle')}
        onCancel={() => setKeywordTitleModal(false)}
        footer={null}
      >
        <List
          dataSource={titleList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  key="use"
                  onClick={() => {
                    setTitle(item);
                    setKeywordTitleModal(false);
                  }}
                >
                  {t('ai.selectTitle')}
                </Button>,
              ]}
            >
              {item}
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
