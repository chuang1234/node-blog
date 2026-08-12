/**
 * Joi 参数校验规则集中定义
 * 所有中文错误提示统一在此维护，便于前端展示
 */
const Joi = require('joi');

// ---------------- 通用片段 ----------------
const id = Joi.number().integer().positive();

const pagination = {
  pageNum: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(10),
};

const STYLES = ['formal', 'lively', 'concise', 'academic'];
const LENGTHS = ['short', 'medium', 'long'];
const TONES = ['friendly', 'professional', 'humorous'];

// ---------------- 用户 ----------------
const user = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required().messages({
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名至少 3 个字符',
      'string.max': '用户名最多 20 个字符',
      'any.required': '请填写用户名',
    }),
    email: Joi.string().email().max(120).required().messages({
      'string.email': '请输入合法的邮箱地址',
      'any.required': '请填写邮箱',
    }),
    password: Joi.string().min(6).max(32).required().messages({
      'string.min': '密码至少 6 位',
      'string.max': '密码最多 32 位',
      'any.required': '请填写密码',
    }),
    nickname: Joi.string().max(50).allow('').default(''),
  }),

  login: Joi.object({
    account: Joi.string().max(120).required().messages({ 'any.required': '请填写账号' }),
    password: Joi.string().max(32).required().messages({ 'any.required': '请填写密码' }),
  }),

  updateProfile: Joi.object({
    nickname: Joi.string().max(50).allow(''),
    bio: Joi.string().max(500).allow(''),
    email: Joi.string().email().max(120),
    avatar: Joi.string().uri({ allowRelative: true }).max(255).allow(''),
    aiStyle: Joi.string().valid(...STYLES),
  }).min(1).messages({ 'object.min': '请至少修改一项内容' }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required().messages({ 'any.required': '请填写原密码' }),
    newPassword: Joi.string().min(6).max(32).required().messages({
      'string.min': '新密码至少 6 位',
      'any.required': '请填写新密码',
    }),
  }),

  adminListQuery: Joi.object({
    ...pagination,
    keyword: Joi.string().max(50).allow(''),
    role: Joi.string().valid('user', 'admin').allow(''),
    status: Joi.number().valid(0, 1).allow(''),
  }),

  adminUpdate: Joi.object({
    status: Joi.number().valid(0, 1),
    role: Joi.string().valid('user', 'admin'),
  }).min(1),
};

// ---------------- 博客 ----------------
const blog = {
  create: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.max': '标题最多 200 个字符',
      'any.required': '请填写标题',
    }),
    content: Joi.string().min(1).max(200000).required().messages({
      'any.required': '正文内容不能为空',
      'string.max': '正文内容过长',
    }),
    summary: Joi.string().max(900).allow(''),
    cover: Joi.string().max(255).allow(''),
    categoryId: id.allow(null, ''),
    keywords: Joi.alternatives().try(Joi.string().max(255), Joi.array().items(Joi.string().max(40))).allow(''),
    tags: Joi.array().items(Joi.string().max(40)).max(10).default([]).messages({
      'array.max': '最多添加 10 个标签',
    }),
    status: Joi.string().valid('draft', 'published').default('draft'),
    isAiAssisted: Joi.boolean().default(false),
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200),
    content: Joi.string().min(1).max(200000),
    summary: Joi.string().max(900).allow(''),
    cover: Joi.string().max(255).allow(''),
    categoryId: id.allow(null, ''),
    keywords: Joi.alternatives().try(Joi.string().max(255), Joi.array().items(Joi.string().max(40))).allow(''),
    tags: Joi.array().items(Joi.string().max(40)).max(10),
    status: Joi.string().valid('draft', 'published', 'offline'),
    isAiAssisted: Joi.boolean(),
  }).min(1).messages({ 'object.min': '请至少修改一项内容' }),

  listQuery: Joi.object({
    ...pagination,
    keyword: Joi.string().max(100).allow(''),
    categoryId: id.allow(''),
    tagId: id.allow(''),
    userId: id.allow(''),
    status: Joi.string().valid('draft', 'published', 'offline').allow(''),
    orderBy: Joi.string().valid('latest', 'hot', 'comment', 'updated').default('latest'),
  }),

  changeStatus: Joi.object({
    status: Joi.string().valid('draft', 'published', 'offline').required(),
  }),

  idParam: Joi.object({ id: id.required().messages({ 'any.required': '缺少文章 ID' }) }),
};

// ---------------- 评论 ----------------
const comment = {
  create: Joi.object({
    blogId: id.required().messages({ 'any.required': '缺少文章 ID' }),
    content: Joi.string().min(1).max(2000).required().messages({
      'string.max': '评论最多 2000 字',
      'any.required': '评论内容不能为空',
    }),
    parentId: id.allow(null),
    isAiReply: Joi.boolean().default(false),
  }),

  listQuery: Joi.object({
    ...pagination,
    orderBy: Joi.string().valid('latest', 'hot').default('latest'),
    sentiment: Joi.string().valid('positive', 'neutral', 'negative').allow(''),
  }),

  report: Joi.object({
    reason: Joi.string().max(500).allow('').default(''),
  }),

  adminListQuery: Joi.object({
    ...pagination,
    keyword: Joi.string().max(100).allow(''),
    sentiment: Joi.string().valid('positive', 'neutral', 'negative', 'unknown').allow(''),
    status: Joi.string().valid('normal', 'hidden', 'pending').allow(''),
    blogId: id.allow(''),
  }),
};

// ---------------- AI ----------------
const ai = {
  draft: Joi.object({
    topic: Joi.string().min(2).max(200).required().messages({
      'string.min': '主题至少 2 个字',
      'any.required': '请填写创作主题',
    }),
    style: Joi.string().valid(...STYLES).default('formal'),
    outline: Joi.string().max(2000).allow('').default(''),
    lang: Joi.string().valid('zh', 'en').default('zh'),
  }),

  content: Joi.object({
    content: Joi.string().min(1).max(50000).required().messages({
      'any.required': '请提供需要处理的内容',
      'string.max': '内容过长，请分段处理（上限 5 万字符）',
    }),
    style: Joi.string().valid(...STYLES),
  }),

  summary: Joi.object({
    content: Joi.string().min(1).max(50000).required(),
    length: Joi.string().valid(...LENGTHS).default('medium'),
  }),

  keywords: Joi.object({
    content: Joi.string().min(1).max(50000).required(),
    count: Joi.number().integer().min(1).max(15).default(6),
  }),

  title: Joi.object({
    content: Joi.string().min(1).max(50000).required(),
    count: Joi.number().integer().min(1).max(10).default(5),
  }),

  reply: Joi.object({
    blogId: id.allow(null, ''),
    comment: Joi.string().min(1).max(2000).required().messages({ 'any.required': '请提供评论内容' }),
    tone: Joi.string().valid(...TONES).default('friendly'),
  }),

  replyCommentById: Joi.object({
    commentId: id.required(),
    tone: Joi.string().valid(...TONES).default('friendly'),
  }),

  sentiment: Joi.object({
    text: Joi.string().min(1).max(5000).required(),
  }),

  moderate: Joi.object({
    content: Joi.string().min(1).max(50000).required(),
  }),

  recommendQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6),
  }),

  topicsQuery: Joi.object({
    count: Joi.number().integer().min(1).max(10).default(5),
  }),
};

// ---------------- 分类 / 标签 ----------------
const category = {
  create: Joi.object({
    name: Joi.string().min(1).max(50).required().messages({ 'any.required': '请填写分类名称' }),
    slug: Joi.string().max(60).allow(''),
    description: Joi.string().max(255).allow(''),
    icon: Joi.string().max(60).allow(''),
    sortOrder: Joi.number().integer().default(0),
  }),
  update: Joi.object({
    name: Joi.string().min(1).max(50),
    slug: Joi.string().max(60),
    description: Joi.string().max(255).allow(''),
    icon: Joi.string().max(60).allow(''),
    sortOrder: Joi.number().integer(),
  }).min(1),
  createTag: Joi.object({
    name: Joi.string().min(1).max(40).required().messages({ 'any.required': '请填写标签名称' }),
    color: Joi.string().max(20).default('blue'),
  }),
};

// ---------------- 管理端 ----------------
const admin = {
  aiConfigSave: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          configKey: Joi.string().max(60).required(),
          configValue: Joi.alternatives().try(Joi.string().allow(''), Joi.number(), Joi.boolean()).required(),
        })
      )
      .min(1)
      .required()
      .messages({ 'any.required': '请提供要保存的配置项' }),
  }),

  sensitiveWordCreate: Joi.object({
    word: Joi.string().min(1).max(60).required().messages({ 'any.required': '请填写敏感词' }),
    category: Joi.string().valid('politics', 'porn', 'ad', 'abuse', 'other').default('other'),
    level: Joi.number().integer().valid(1, 2, 3).default(1),
  }),

  sensitiveWordUpdate: Joi.object({
    category: Joi.string().valid('politics', 'porn', 'ad', 'abuse', 'other'),
    level: Joi.number().integer().valid(1, 2, 3),
    enabled: Joi.boolean(),
  }).min(1),

  sensitiveWordQuery: Joi.object({
    ...pagination,
    keyword: Joi.string().max(60).allow(''),
    category: Joi.string().max(30).allow(''),
  }),

  aiLogQuery: Joi.object({
    ...pagination,
    action: Joi.string().max(40).allow(''),
    status: Joi.string().valid('success', 'failed').allow(''),
    userId: id.allow(''),
  }),

  trendQuery: Joi.object({
    days: Joi.number().integer().min(1).max(90).default(7),
  }),
};

const common = {
  idParam: Joi.object({ id: id.required() }),
  pageQuery: Joi.object({ ...pagination }),
};

module.exports = { user, blog, comment, ai, category, admin, common, pagination };
