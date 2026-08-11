/**
 * AI Agent 能力接口
 *
 * 说明：AI 接口耗时较长（request.ts 中已对 /ai/ 路径放宽到 90s 超时），
 * 调用方应配合 loading 态给出实时反馈。
 */
import { request } from '@/utils/request';
import type {
  AiDraftResult,
  AiKeywordsResult,
  AiLength,
  AiModerateResult,
  AiReplyResult,
  AiSentimentResult,
  AiStatus,
  AiStyle,
  AiSummaryResult,
  AiTextResult,
  AiTitleResult,
  AiTone,
  AiTopic,
  Blog,
} from '@/types';

export const aiApi = {
  /** AI 能力状态（是否开启、当前模型、配额），前端据此显示/隐藏 AI 入口 */
  status: () => request.get<AiStatus>('/api/ai/status', undefined, { silent: true }),

  /** 生成博客初稿 */
  draft: (data: { topic: string; style?: AiStyle; outline?: string; lang?: 'zh' | 'en' }) =>
    request.post<AiDraftResult>('/api/ai/draft', data),

  /** 内容润色 */
  polish: (data: { content: string; style?: AiStyle }) =>
    request.post<AiTextResult>('/api/ai/polish', data),

  /** 错别字与语病修正 */
  proofread: (data: { content: string }) => request.post<AiTextResult>('/api/ai/proofread', data),

  /** 段落重构 */
  restructure: (data: { content: string; style?: AiStyle }) =>
    request.post<AiTextResult>('/api/ai/restructure', data),

  /** 标题优化，返回多个候选 */
  title: (data: { content: string; count?: number }) =>
    request.post<AiTitleResult>('/api/ai/title', data),

  /** 智能摘要（长度可选） */
  summary: (data: { content: string; length?: AiLength }) =>
    request.post<AiSummaryResult>('/api/ai/summary', data),

  /** 关键词提取 */
  keywords: (data: { content: string; count?: number }) =>
    request.post<AiKeywordsResult>('/api/ai/keywords', data),

  /** 生成评论回复（可配置语气） */
  reply: (data: { comment: string; blogId?: number | null; tone?: AiTone }) =>
    request.post<AiReplyResult>('/api/ai/reply', data),

  /** 情感分析 */
  sentiment: (data: { text: string }) => request.post<AiSentimentResult>('/api/ai/sentiment', data),

  /** 内容审核 */
  moderate: (data: { content: string }) =>
    request.post<AiModerateResult>('/api/ai/moderate', data, { silent: true }),

  /** 创作话题推荐 */
  topics: (count = 5) => request.get<AiTopic[] | { topics: AiTopic[] }>('/api/ai/topics', { count }),

  /** 个性化内容推荐（游客返回热门） */
  recommend: (limit = 6) =>
    request.get<Blog[] | { list: Blog[] }>('/api/ai/recommend', { limit }, { silent: true }),
};
