/**
 * 全局类型定义
 * 与后端 server/src 中的响应结构一一对应
 */

// ==================== 通用 ====================

/** 后端统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页信息 */
export interface Pagination {
  total: number;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

/** 分页响应数据 */
export interface PageData<T> {
  list: T[];
  pagination: Pagination;
}

/** 分页查询基础参数 */
export interface PageQuery {
  pageNum?: number;
  pageSize?: number;
}

// ==================== 用户 ====================

export type UserRole = 'user' | 'admin';

/** AI 创作风格 */
export type AiStyle = 'formal' | 'lively' | 'concise' | 'academic';

/** 摘要长度 */
export type AiLength = 'short' | 'medium' | 'long';

/** AI 回复语气 */
export type AiTone = 'friendly' | 'professional' | 'humorous';

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  bio: string;
  role: UserRole;
  status: number;
  aiStyle?: AiStyle;
  blogCount?: number;
  totalViews?: number;
  totalLikes?: number;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  createdAt?: string;
}

/** 关注列表中的用户项（public 字段 + 当前用户是否已关注） */
export interface FollowUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  bio: string;
  isFollowing?: boolean;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

export interface UpdateProfilePayload {
  nickname?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  aiStyle?: AiStyle;
}

// ==================== 博客 ====================

export type BlogStatus = 'draft' | 'published' | 'offline';
export type AuditStatus = 'pending' | 'pass' | 'reject';

export interface Tag {
  id: number;
  name: string;
  color: string;
  refCount?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  blogCount?: number;
}

export interface Blog {
  id: number;
  userId: number;
  categoryId: number | null;
  title: string;
  summary: string;
  content?: string;
  cover: string;
  keywords: string;
  status: BlogStatus;
  auditStatus: AuditStatus;
  auditRemark?: string;
  isAiAssisted: number | boolean;
  isTop: number | boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  wordCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 关联字段
  authorName?: string;
  authorAvatar?: string;
  categoryName?: string;
  tags?: Tag[];
  // 当前登录用户的互动状态
  liked?: boolean;
  favorited?: boolean;
}

export interface BlogListQuery extends PageQuery {
  keyword?: string;
  categoryId?: number | string;
  tagId?: number | string;
  userId?: number | string;
  status?: BlogStatus | '';
  orderBy?: 'latest' | 'hot' | 'comment' | 'updated';
}

export interface BlogPayload {
  title: string;
  content: string;
  summary?: string;
  cover?: string;
  categoryId?: number | null;
  keywords?: string | string[];
  tags?: string[];
  status?: BlogStatus;
  isAiAssisted?: boolean;
}

// ==================== 评论 ====================

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'unknown';
export type CommentStatus = 'normal' | 'hidden' | 'pending';

export interface Comment {
  id: number;
  blogId: number;
  userId: number;
  parentId: number | null;
  rootId: number | null;
  content: string;
  sentiment: Sentiment;
  sentimentScore: number;
  isAiReply: number | boolean;
  likeCount: number;
  status: CommentStatus;
  createdAt: string;
  // 关联字段
  userName?: string;
  userAvatar?: string;
  blogTitle?: string;
  replyToName?: string;
  replies?: Comment[];
  replyCount?: number;
  liked?: boolean;
}

export interface CommentPayload {
  blogId: number;
  content: string;
  parentId?: number | null;
  isAiReply?: boolean;
}

export interface Report {
  id: number;
  targetType: string;
  targetId: number;
  userId: number;
  reason: string;
  status: string;
  createdAt: string;
  reporterName?: string;
  targetContent?: string;
}

// ==================== AI ====================

export interface AiStatus {
  enabled: boolean;
  provider: string;
  model: string;
  defaultStyle: AiStyle;
  /** 是否为内置离线规则引擎 */
  offlineMode: boolean;
  rateLimit: {
    perMin: number;
    perDay: number;
  };
}

/** AI 通用返回中都会带的元信息 */
export interface AiMeta {
  provider?: string;
  durationMs?: number;
  /** 真实模型失败后自动降级到离线引擎 */
  degraded?: boolean;
}

export interface AiDraftResult extends AiMeta {
  title?: string;
  content: string;
  outline?: string[];
}

export interface AiTextResult extends AiMeta {
  content: string;
  original?: string;
  /** 校对场景下的修改点 */
  changes?: Array<{ from: string; to: string; reason?: string }>;
}

export interface AiSummaryResult extends AiMeta {
  summary: string;
  length?: AiLength;
}

export interface AiKeywordsResult extends AiMeta {
  keywords: string[];
}

export interface AiTitleResult extends AiMeta {
  titles: string[];
}

export interface AiReplyResult extends AiMeta {
  reply: string;
  tone?: AiTone;
}

export interface AiSentimentResult extends AiMeta {
  sentiment: Sentiment;
  score: number;
  reason?: string;
}

export interface AiModerateResult extends AiMeta {
  pass: boolean;
  level?: number;
  hitWords?: string[];
  categories?: string[];
  reason?: string;
  suggestion?: string;
}

export interface AiTopic {
  title: string;
  reason?: string;
  keywords?: string[];
}

// ==================== 后台管理 ====================

export interface StatsOverview {
  totalUsers: number;
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  totalComments: number;
  totalViews: number;
  today: {
    pv: number;
    uv: number;
    newUsers: number;
    newBlogs: number;
    newComments: number;
  };
  ai: {
    totalCalls: number;
    totalTokens: number;
    avgDuration: number;
    failedCount: number;
  };
}

export interface TrendPoint {
  date: string;
  pv: number;
  uv: number;
  newUsers: number;
  newBlogs: number;
  newComments: number;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface StatsDistribution {
  categories: NameValue[];
  sentiments: NameValue[];
  aiActions: NameValue[];
  hotBlogs: Blog[];
}

export interface AiConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  valueType: 'string' | 'number' | 'boolean';
  description: string;
}

export interface AiLog {
  id: number;
  userId: number | null;
  action: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  status: 'success' | 'failed';
  errorMsg: string;
  createdAt: string;
  userName?: string;
}

export interface SensitiveWord {
  id: number;
  word: string;
  category: 'politics' | 'porn' | 'ad' | 'abuse' | 'other';
  level: 1 | 2 | 3;
  enabled: number | boolean;
  createdAt?: string;
}

// ==================== 通知 ====================

export type NotificationType = 'comment' | 'reply' | 'like_blog' | 'like_comment' | 'favorite' | 'follow';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  actorId: number;
  blogId: number | null;
  commentId: number | null;
  targetType: string | null;
  targetId: number | null;
  isRead: number;
  createdAt: string;
  // 关联字段
  actorName?: string;
  actorAvatar?: string;
  blogTitle?: string;
  blogStatus?: string;
}

export interface NotificationListResult {
  list: Notification[];
  unreadCount: number;
  pagination: Pagination;
}
