/**
 * 全局 AI 创作助手
 *
 * 以后台浮窗（Drawer）形式提供：初稿生成、润色、纠错、段落重构、标题优化、
 * 摘要、关键词、内容审核、选题灵感。结果可一键「应用到编辑器」——
 * 通过自定义事件 ai-apply 与编辑器通信（编辑器监听后写入对应字段）。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  Button,
  Input,
  Select,
  Spin,
  Tag,
  Alert,
  Empty,
  List,
  Tooltip,
  Badge,
  message as antdMessage,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  EditOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { aiApi } from '@/api';
import { useAppSelector } from '@/store';
import type { AiStyle, AiLength } from '@/types';
import { nl2br } from '@/utils/format';
import './AiAssistant.less';

type Feature =
  | 'draft'
  | 'polish'
  | 'proofread'
  | 'restructure'
  | 'title'
  | 'summary'
  | 'keywords'
  | 'moderate'
  | 'topics';

/** 向编辑器派发应用事件 */
function applyToEditor(field: 'content' | 'title' | 'summary' | 'keywords', value: string) {
  window.dispatchEvent(new CustomEvent('ai-apply', { detail: { field, value } }));
  antdMessage.success('已应用到编辑器');
}

export default function AiAssistant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const aiStatus = useAppSelector((s) => s.ai.status);
  const themeMode = useAppSelector((s) => s.theme.mode);

  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<Feature>('draft');
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [outline, setOutline] = useState('');
  const [style, setStyle] = useState<AiStyle>('lively');
  const [length, setLength] = useState<AiLength>('medium');
  const [count, setCount] = useState(5);
  const [result, setResult] = useState<Record<string, any> | null>(null);

  const disabled = aiStatus?.enabled === false;

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      if (feature === 'draft') {
        if (!topic.trim()) {
          antdMessage.warning(t('ai.needTopic'));
          setLoading(false);
          return;
        }
        const res = await aiApi.draft({
          topic: topic.trim(),
          outline: outline.trim() || undefined,
          style,
          lang: 'zh',
        });
        setResult(res as unknown as Record<string, unknown>);
      } else if (feature === 'topics') {
        const res = await aiApi.topics(count);
        const list = Array.isArray(res) ? res : (res as { topics: AiTopicLike[] }).topics;
        setResult({ topics: list });
      } else {
        const content = text.trim();
        if (content.length < 20) {
          antdMessage.warning(t('ai.contentTooShort'));
          setLoading(false);
          return;
        }
        if (feature === 'polish') {
          setResult((await aiApi.polish({ content, style })) as unknown as Record<string, unknown>);
        } else if (feature === 'proofread') {
          setResult((await aiApi.proofread({ content })) as unknown as Record<string, unknown>);
        } else if (feature === 'restructure') {
          setResult((await aiApi.restructure({ content, style })) as unknown as Record<string, unknown>);
        } else if (feature === 'title') {
          setResult((await aiApi.title({ content, count })) as unknown as Record<string, unknown>);
        } else if (feature === 'summary') {
          setResult((await aiApi.summary({ content, length })) as unknown as Record<string, unknown>);
        } else if (feature === 'keywords') {
          setResult((await aiApi.keywords({ content, count })) as unknown as Record<string, unknown>);
        } else if (feature === 'moderate') {
          setResult((await aiApi.moderate({ content })) as unknown as Record<string, unknown>);
        }
      }
    } catch {
      // 错误已由 request 拦截器统一提示
    } finally {
      setLoading(false);
    }
  };

  const copy = (textValue: string) => {
    navigator.clipboard?.writeText(textValue);
    antdMessage.success(t('common.copied'));
  };

  // ---------------- 结果渲染 ----------------
  const renderResult = () => {
    if (loading) {
      return (
        <div className="ai-assistant__loading">
          <Spin />
          <span>{t('ai.generating')}</span>
        </div>
      );
    }
    if (!result) return <Empty description={t('ai.panelTitle')} />;

    if (feature === 'draft') {
      const content = String(result.content || '');
      const outlines = (result.outline as string[] | undefined) || [];
      return (
        <div className="ai-assistant__result">
          {result.title && (
            <div className="ai-assistant__block">
              <label>{t('blog.title')}</label>
              <div className="ai-assistant__text">{String(result.title)}</div>
              <Button size="small" icon={<EditOutlined />} onClick={() => applyToEditor('title', String(result.title))}>
                {t('ai.titleApplied')}
              </Button>
            </div>
          )}
          {outlines.length > 0 && (
            <div className="ai-assistant__block">
              <label>{t('ai.draftOutline')}</label>
              <ul className="ai-assistant__list">
                {outlines.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="ai-assistant__block">
            <label>{t('blog.content')}</label>
            <div
              className="ai-assistant__text"
              dangerouslySetInnerHTML={{ __html: nl2br(content) }}
            />
            <div className="ai-assistant__actions">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => applyToEditor('content', content)}
              >
                {t('ai.applied')}
              </Button>
              <Button size="small" icon={<CopyOutlined />} onClick={() => copy(content)}>
                {t('common.copy')}
              </Button>
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() => navigate('/write', { state: { content } })}
              >
                {t('nav.write')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (feature === 'title') {
      const titles = (result.titles as string[]) || [];
      return (
        <List
          size="small"
          dataSource={titles}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title={t('ai.selectTitle')} key="apply">
                  <Button type="link" size="small" onClick={() => applyToEditor('title', item)}>
                    {t('ai.titleApplied')}
                  </Button>
                </Tooltip>,
                <Button type="link" size="small" icon={<CopyOutlined />} key="copy" onClick={() => copy(item)} />,
              ]}
            >
              {item}
            </List.Item>
          )}
        />
      );
    }

    if (feature === 'keywords') {
      const kws = (result.keywords as string[]) || [];
      return (
        <div className="ai-assistant__result">
          <div className="ai-assistant__tags">
            {kws.map((k) => (
              <Tag key={k} color="blue" closable={false}>
                {k}
              </Tag>
            ))}
          </div>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => applyToEditor('keywords', kws.join(','))}
          >
            {t('ai.keywordsApplied')}
          </Button>
        </div>
      );
    }

    if (feature === 'summary') {
      const summary = String(result.summary || '');
      return (
        <div className="ai-assistant__result">
          <div className="ai-assistant__text" dangerouslySetInnerHTML={{ __html: nl2br(summary) }} />
          <div className="ai-assistant__actions">
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => applyToEditor('summary', summary)}>
              {t('ai.summaryApplied')}
            </Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(summary)}>
              {t('common.copy')}
            </Button>
          </div>
        </div>
      );
    }

    if (feature === 'moderate') {
      const pass = Boolean(result.pass);
      const hitWords = (result.hitWords as string[]) || [];
      return (
        <div className="ai-assistant__result">
          <Alert
            type={pass ? 'success' : 'error'}
            showIcon
            message={pass ? t('ai.moderatePass') : t('ai.moderateReject')}
            description={
              <div>
                {result.reason && <p>{String(result.reason)}</p>}
                {hitWords.length > 0 && (
                  <p>
                    {t('ai.hitWords')}：{hitWords.join('、')}
                  </p>
                )}
              </div>
            }
          />
        </div>
      );
    }

    if (feature === 'topics') {
      const topicsList = (result.topics as AiTopicLike[]) || [];
      return (
        <List
          size="small"
          dataSource={topicsList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  key="use"
                  onClick={() => {
                    setTopic(item.title);
                    setFeature('draft');
                  }}
                >
                  {t('ai.draft')}
                </Button>,
              ]}
            >
              <List.Item.Meta title={item.title} description={item.reason} />
            </List.Item>
          )}
        />
      );
    }

    // polish / proofread / restructure：返回 content 文本
    const content = String(result.content || '');
    return (
      <div className="ai-assistant__result">
        <div className="ai-assistant__text" dangerouslySetInnerHTML={{ __html: nl2br(content) }} />
        <div className="ai-assistant__actions">
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => applyToEditor('content', content)}>
            {t('ai.applied')}
          </Button>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copy(content)}>
            {t('common.copy')}
          </Button>
        </div>
      </div>
    );
  };

  const featureOptions: { value: Feature; label: string; desc: string; needText: boolean }[] = [
    { value: 'draft', label: t('ai.draft'), desc: t('ai.draftDesc'), needText: false },
    { value: 'polish', label: t('ai.polish'), desc: t('ai.polishDesc'), needText: true },
    { value: 'proofread', label: t('ai.proofread'), desc: t('ai.proofreadDesc'), needText: true },
    { value: 'restructure', label: t('ai.restructure'), desc: t('ai.restructureDesc'), needText: true },
    { value: 'title', label: t('ai.optimizeTitle'), desc: t('ai.optimizeTitleDesc'), needText: true },
    { value: 'summary', label: t('ai.summary'), desc: t('ai.summaryDesc'), needText: true },
    { value: 'keywords', label: t('ai.keywords'), desc: t('ai.keywordsDesc'), needText: true },
    { value: 'moderate', label: t('ai.moderate'), desc: t('ai.moderateDesc'), needText: true },
    { value: 'topics', label: t('ai.topics'), desc: t('ai.topicsDesc'), needText: false },
  ];

  const current = featureOptions.find((f) => f.value === feature);

  return (
    <>
      <button
        className={`ai-assistant-fab ${themeMode === 'dark' ? 'is-dark' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="AI Assistant"
      >
        <Badge dot color={disabled ? '#bfbfbf' : '#52c41a'} offset={[-4, 4]}>
          <RobotOutlined style={{ fontSize: 24 }} />
        </Badge>
      </button>

      <Drawer
        title={
          <span className="ai-assistant__title">
            <ThunderboltOutlined /> {t('ai.assistant')}
            {aiStatus?.offlineMode && (
              <Tag color="purple" style={{ marginLeft: 8 }}>
                {t('ai.offlineMode')}
              </Tag>
            )}
          </span>
        }
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        styles={{ body: { padding: 0 } }}
      >
        {disabled ? (
          <Alert type="warning" showIcon style={{ margin: 16 }} message={t('ai.disabled')} />
        ) : (
          <div className="ai-assistant__panel">
            <div className="ai-assistant__features">
              {featureOptions.map((f) => (
                <button
                  key={f.value}
                  className={`ai-assistant__feature ${feature === f.value ? 'is-active' : ''}`}
                  onClick={() => {
                    setFeature(f.value);
                    setResult(null);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ai-assistant__desc">{current?.desc}</div>

            <div className="ai-assistant__input">
              {feature === 'draft' ? (
                <>
                  <Input
                    placeholder={t('ai.draftTopic')}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="ai-assistant__field"
                  />
                  <Input.TextArea
                    placeholder={t('ai.draftOutline')}
                    value={outline}
                    onChange={(e) => setOutline(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                  <Select
                    value={style}
                    onChange={setStyle}
                    className="ai-assistant__field"
                    options={[
                      { value: 'formal', label: t('ai.styleFormal') },
                      { value: 'lively', label: t('ai.styleLively') },
                      { value: 'concise', label: t('ai.styleConcise') },
                      { value: 'academic', label: t('ai.styleAcademic') },
                    ]}
                  />
                </>
              ) : feature === 'topics' ? (
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 5)}
                  addonBefore={t('ai.count')}
                />
              ) : (
                <>
                  <Input.TextArea
                    placeholder={t('ai.needContent')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoSize={{ minRows: 6, maxRows: 14 }}
                  />
                  {(feature === 'polish' || feature === 'restructure') && (
                    <Select
                      value={style}
                      onChange={setStyle}
                      className="ai-assistant__field"
                      options={[
                        { value: 'formal', label: t('ai.styleFormal') },
                        { value: 'lively', label: t('ai.styleLively') },
                        { value: 'concise', label: t('ai.styleConcise') },
                        { value: 'academic', label: t('ai.styleAcademic') },
                      ]}
                    />
                  )}
                  {feature === 'summary' && (
                    <Select
                      value={length}
                      onChange={setLength}
                      className="ai-assistant__field"
                      options={[
                        { value: 'short', label: t('ai.lengthShort') },
                        { value: 'medium', label: t('ai.lengthMedium') },
                        { value: 'long', label: t('ai.lengthLong') },
                      ]}
                    />
                  )}
                  {(feature === 'title' || feature === 'keywords') && (
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value) || 5)}
                      addonBefore={t('ai.count')}
                    />
                  )}
                </>
              )}
            </div>

            <Button
              type="primary"
              block
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={run}
              className="ai-assistant__run"
            >
              {t('common.submit')}
            </Button>

            <div className="ai-assistant__output">{renderResult()}</div>
          </div>
        )}
      </Drawer>
    </>
  );
}

interface AiTopicLike {
  title: string;
  reason?: string;
  keywords?: string[];
}
