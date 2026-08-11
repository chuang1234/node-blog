-- =====================================================================
-- AI Agent 博客系统 - 初始化种子数据
-- 依赖: 先执行 init.sql
-- 默认账号:
--   管理员 admin / admin123
--   普通用户 demo  / demo123
-- 注意: 下方 password 字段为占位 hash，请务必通过 `npm run db:init` 执行，
--       该脚本会在导入后用 bcryptjs 现场计算并回写真实密码哈希。
--       若手工导入本文件，请自行调用 scripts/resetPassword.js 重置密码。
-- =====================================================================
USE `ai_blog`;
SET NAMES utf8mb4;

-- ---------------- 用户 ----------------
INSERT INTO `users` (`username`, `email`, `password`, `nickname`, `bio`, `role`) VALUES
('admin', 'admin@ai-blog.dev', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '站长', '这个站点的管理员，负责内容与 AI 参数配置。', 'admin'),
('demo',  'demo@ai-blog.dev',  '$2a$10$3Xw8Fp7Yz1kQ0mJ5tGvBOeR2sN9cKdL4hVpA6uW8xY0zB1cD2eF3G', '示例用户', '一名热爱写作的普通用户。', 'user')
ON DUPLICATE KEY UPDATE `nickname` = VALUES(`nickname`);

-- ---------------- 分类 ----------------
INSERT INTO `categories` (`name`, `slug`, `description`, `icon`, `sort_order`) VALUES
('技术分享', 'tech',    '编程、架构、工具链等技术类文章', 'CodeOutlined',      1),
('产品思考', 'product', '产品设计、需求分析与商业观察',   'BulbOutlined',      2),
('AI 前沿',  'ai',      '大模型、Agent、AIGC 相关内容',   'RobotOutlined',     3),
('生活随笔', 'life',    '日常记录、读书笔记与随想',       'CoffeeOutlined',    4),
('职场成长', 'career',  '职业发展、效率方法与复盘',       'RiseOutlined',      5)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ---------------- 标签 ----------------
INSERT INTO `tags` (`name`, `color`) VALUES
('Node.js', 'green'), ('React', 'blue'), ('TypeScript', 'geekblue'), ('大模型', 'purple'),
('Agent', 'magenta'), ('MySQL', 'orange'), ('Redis', 'red'), ('性能优化', 'cyan'),
('架构设计', 'gold'), ('读书笔记', 'lime')
ON DUPLICATE KEY UPDATE `color` = VALUES(`color`);

-- ---------------- AI 配置 ----------------
INSERT INTO `ai_configs` (`config_key`, `config_value`, `value_type`, `description`) VALUES
('ai.enabled',            'true',      'boolean', '是否启用 AI Agent 能力总开关'),
('ai.provider',           'mock',      'string',  '当前使用的模型厂商: openai/qwen/ernie/deepseek/mock'),
('ai.model',              'gpt-4o-mini','string', '当前使用的模型名称'),
('ai.temperature',        '0.7',       'number',  '生成温度 0~2，越大越发散'),
('ai.max_tokens',         '2048',      'number',  '单次生成最大 token 数'),
('ai.default_style',      'formal',    'string',  '默认创作风格: formal/lively/concise/academic'),
('ai.rate_limit_per_min', '10',        'number',  '单用户每分钟 AI 调用上限'),
('ai.rate_limit_per_day', '200',       'number',  '单用户每天 AI 调用上限'),
('ai.auto_moderate',      'true',      'boolean', '发布内容时是否自动进行 AI 审核（文章/评论通用回退开关）'),
('ai.auto_moderate_blog', 'true',      'boolean', '发布文章时是否自动进行 AI 审核'),
('ai.auto_moderate_comment', 'true',   'boolean', '发表评论时是否自动进行 AI 审核'),
('ai.auto_summary',       'true',      'boolean', '发布时若摘要为空是否自动生成'),
('ai.auto_reply_comment', 'false',     'boolean', '是否对新评论自动进行 AI 回复'),
('ai.reply_tone',         'friendly',  'string',  'AI 回复语气: friendly/professional/humorous'),
('ai.reply_scope',        'positive',  'string',  'AI 自动回复范围: all/positive/question'),
('ai.sentiment_enabled',  'true',      'boolean', '是否对评论做情感分析'),
('ai.moderate_level',     '2',         'number',  '审核严格级别 1-宽松 2-标准 3-严格')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ---------------- 敏感词(示例, 生产环境请替换为完整词库) ----------------
INSERT INTO `sensitive_words` (`word`, `category`, `level`) VALUES
('加微信',   'ad',    3), ('代开发票', 'ad',    3), ('私聊领取', 'ad',    2),
('免费领取', 'ad',    1), ('博彩',     'other', 3), ('赌博',     'other', 3),
('傻逼',     'abuse', 3), ('滚蛋',     'abuse', 2), ('垃圾东西', 'abuse', 1),
('刷单',     'ad',    3), ('一键脱衣', 'porn',  3), ('成人内容', 'porn',  2)
ON DUPLICATE KEY UPDATE `level` = VALUES(`level`);

-- ---------------- 示例博客 ----------------
INSERT INTO `blogs` (`user_id`, `category_id`, `title`, `summary`, `content`, `keywords`, `status`, `audit_status`, `is_ai_assisted`, `view_count`, `word_count`, `published_at`)
SELECT u.id, c.id,
  '用 Node.js 与 React 搭建一个带 AI Agent 的博客系统',
  '本文介绍如何基于 Express + MySQL + Redis 构建后端，用 React 18 与 Ant Design 构建前端，并把大模型能力以独立服务层的方式融入创作、审核、互动全流程。',
  '# 前言\n\n把 AI 塞进博客系统，最容易犯的错误是把大模型调用散落在各个控制器里。正确的做法是把它当成一个**独立的能力层**。\n\n## 一、架构分层\n\n后端采用经典四层结构：\n\n- 路由层：只做 URL 与参数入口\n- 控制器层：处理 HTTP 语义\n- 服务层：业务编排\n- 数据访问层：SQL 收敛\n\nAI 服务作为服务层的一个横向能力存在，通过统一的 Provider 抽象屏蔽不同厂商差异。\n\n## 二、为什么要做 Provider 抽象\n\n```js\nclass BaseProvider {\n  async chat(messages, options) {\n    throw new Error(\"not implemented\");\n  }\n}\n```\n\n有了这层抽象，从 GPT 换到通义千问只需要改一个环境变量。\n\n## 三、缓存策略\n\n热点博客详情放 Redis，TTL 5 分钟；列表页按查询条件哈希缓存 60 秒。写操作主动失效对应 key。\n\n## 结语\n\n工程上的克制，比堆功能更重要。',
  'Node.js,React,AI Agent,架构设计',
  'published', 'pass', 1, 128, 420, NOW()
FROM `users` u, `categories` c
WHERE u.username = 'admin' AND c.slug = 'tech'
LIMIT 1;

INSERT INTO `blogs` (`user_id`, `category_id`, `title`, `summary`, `content`, `keywords`, `status`, `audit_status`, `view_count`, `word_count`, `published_at`)
SELECT u.id, c.id,
  'AI Agent 不是聊天框：谈谈能力边界的设计',
  '很多产品把 Agent 做成了一个更大的输入框。本文讨论如何为 Agent 设定明确的能力边界、工具集合与失败降级路径。',
  '# AI Agent 不是聊天框\n\n## 一、边界先于能力\n\n在动手写 prompt 之前，先回答三个问题：\n\n1. 这个 Agent 能做什么？\n2. 它**不能**做什么？\n3. 失败时降级到哪里？\n\n## 二、降级路径\n\n没有配置 API Key 时，系统应当仍然可用。本项目的做法是内置一个 Mock Provider，用规则算法产出可读的结果，保证核心链路不断。\n\n## 三、限流\n\nAI 接口按用户维度做分钟级 + 天级双重限流，防止刷量。',
  'AI Agent,大模型,产品设计',
  'published', 'pass', 86, 300, NOW()
FROM `users` u, `categories` c
WHERE u.username = 'admin' AND c.slug = 'ai'
LIMIT 1;

INSERT INTO `blogs` (`user_id`, `category_id`, `title`, `summary`, `content`, `keywords`, `status`, `audit_status`, `view_count`, `word_count`, `published_at`)
SELECT u.id, c.id,
  'Redis 缓存踩坑记：从穿透到雪崩',
  '记录一次线上缓存故障的排查过程，以及后续在缓存空值、随机 TTL、互斥重建三个方向上的改造。',
  '# Redis 缓存踩坑记\n\n## 缓存穿透\n\n大量请求查询不存在的 ID，全部打到数据库。解决办法是缓存空值，TTL 设短一些。\n\n## 缓存雪崩\n\n同一时刻大批 key 过期。给 TTL 加一个随机扰动即可显著缓解。\n\n## 缓存击穿\n\n热点 key 失效瞬间的并发重建，用互斥锁或逻辑过期解决。',
  'Redis,缓存,性能优化',
  'published', 'pass', 245, 260, NOW()
FROM `users` u, `categories` c
WHERE u.username = 'demo' AND c.slug = 'tech'
LIMIT 1;

-- 关联标签
INSERT IGNORE INTO `blog_tags` (`blog_id`, `tag_id`)
SELECT b.id, t.id FROM `blogs` b, `tags` t
WHERE b.title LIKE '用 Node.js%' AND t.name IN ('Node.js', 'React', '架构设计');

INSERT IGNORE INTO `blog_tags` (`blog_id`, `tag_id`)
SELECT b.id, t.id FROM `blogs` b, `tags` t
WHERE b.title LIKE 'AI Agent 不是%' AND t.name IN ('Agent', '大模型');

INSERT IGNORE INTO `blog_tags` (`blog_id`, `tag_id`)
SELECT b.id, t.id FROM `blogs` b, `tags` t
WHERE b.title LIKE 'Redis 缓存%' AND t.name IN ('Redis', '性能优化');

-- 同步冗余计数
UPDATE `categories` c SET c.blog_count = (
  SELECT COUNT(*) FROM `blogs` b WHERE b.category_id = c.id AND b.status = 'published'
);
UPDATE `tags` t SET t.ref_count = (
  SELECT COUNT(*) FROM `blog_tags` bt WHERE bt.tag_id = t.id
);

-- ---------------- 示例评论 ----------------
INSERT INTO `comments` (`blog_id`, `user_id`, `content`, `sentiment`, `sentiment_score`)
SELECT b.id, u.id, '写得很清晰，Provider 抽象那段很受用，已经在项目里照着改了。', 'positive', 0.860
FROM `blogs` b, `users` u
WHERE b.title LIKE '用 Node.js%' AND u.username = 'demo' LIMIT 1;

INSERT INTO `comments` (`blog_id`, `user_id`, `content`, `sentiment`, `sentiment_score`)
SELECT b.id, u.id, '请问缓存失效的部分有没有更详细的代码示例？', 'neutral', 0.050
FROM `blogs` b, `users` u
WHERE b.title LIKE '用 Node.js%' AND u.username = 'demo' LIMIT 1;

UPDATE `blogs` b SET b.comment_count = (
  SELECT COUNT(*) FROM `comments` c WHERE c.blog_id = b.id AND c.status = 'normal'
);
