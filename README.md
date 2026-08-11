# AI Agent 博客系统

一个集成大模型能力的现代化博客系统，前后端分离架构（Node.js + React）。  
围绕「**AI 辅助创作 → 智能审核 → 互动沉淀 → 个性化推荐**」构建了完整的产品闭环。

> 即使不配置任何大模型 API Key，系统也会自动启用内置**离线规则引擎**（`mock` Provider），  
> 全部 AI 功能（初稿、润色、摘要、关键词、标题、情感分析、内容审核、AI 回复、选题推荐）都可直接跑通。

---

## 功能特性

| 模块          | 能力                                                     |
| ----------- | ------------------------------------------------------ |
| **AI 创作辅助** | 主题生成初稿、文本润色、错别字校正、段落重构、标题优化（多候选）、智能摘要、关键词提取            |
| **智能内容审核**  | 评论发表前自动敏感词+情感分析；可自定义敏感词库（政治/低俗/广告/辱骂/其他，三级处置）          |
| **评论互动**    | 嵌套回复、点赞、收藏、举报；AI 自动生成评论回复草稿                            |
| **个性化推荐**   | 基于浏览记录的「为你推荐」；热门/最新/评论多维排序                             |
| **后台管理**    | 数据看板（趋势图/分布图）、用户/文章/评论/举报管理、分类标签、AI 参数配置、AI 调用日志、敏感词库  |
| **工程化**     | Swagger 文档、定时任务（统计快照/日志清理/热门缓存）、优雅关闭、深/浅色主题、中英双语、响应式布局 |

---

## 技术栈

**后端** `server/`

- Node.js + Express 4
- MySQL 8（mysql2 连接池）/ Redis 4（可降级为内存缓存）
- JWT 鉴权、Joi 校验、helmet + cors + compression 安全加固
- Swagger（`swagger-jsdoc` + `swagger-ui-express`）
- 分层架构：`routes → controllers → services → dao`，配套 `middlewares / validators / utils / config / jobs`
- AI 抽象层：统一 `AiProvider` 接口，内置 `mock`（离线规则引擎）/ `openai`（兼容 OpenAI 协议，可接 DeepSeek、通义千问、文心一言等）

**前端** `web/`

- React 18 + TypeScript + Vite 5
- Ant Design 5 + Redux Toolkit 状态管理
- react-router-dom 6（含登录/管理员路由守卫）
- react-markdown（GFM + 代码高亮）、react-quill、chart.js 数据可视化
- i18next 中英双语；Less 变量注入 + CSS 变量深/浅色主题
- axios 统一封装（拆包、`401` 自动登出、AI 接口 90s 超时）

---

## 项目结构

```
node-blog/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── ai/             # AI Provider 抽象 + 离线规则引擎 + Prompts
│   │   ├── config/         # db / redis / swagger 配置
│   │   ├── controllers/    # 路由处理
│   │   ├── dao/            # 数据访问层（MySQL）
│   │   ├── jobs/           # 定时任务
│   │   ├── middlewares/    # 鉴权/限流/上传/校验
│   │   ├── routes/         # 路由定义（Swagger 注解）
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 响应/日志/JWT 工具
│   │   ├── validators/     # Joi 校验
│   │   ├── app.js          # Express 装配
│   │   └── server.js       # 启动入口（含优雅关闭）
│   ├── scripts/            # initDb.js / resetPassword.js
│   ├── sql/                # init.sql / seed.sql
│   └── tests/              # smoke.test.js 冒烟测试
├── web/                    # 前端应用
│   └── src/
│       ├── api/            # 接口层（按模块封装）
│       ├── components/     # AI 助手 / Markdown 渲染 / 评论区 / 文章卡片等
│       ├── layouts/        # 前台 / 后台布局
│       ├── locales/        # 中英双语文案
│       ├── pages/          # 页面（前台 + admin）
│       ├── router/         # 路由表 + 守卫
│       ├── store/          # Redux 切片
│       ├── styles/         # Less 变量 + 全局样式
│       ├── types/          # TS 类型
│       └── utils/          # 请求封装 / 格式化
└── docs/                   # 部署文档 / 数据库设计 / API 文档
```

---

## 快速开始

### 1. 后端

```bash
cd server
npm install

# 准备数据库（MySQL 8）
mysql -u root -p < sql/init.sql

# 配置环境变量
cp .env.example .env
# 按需修改 .env 中的 DB_* / REDIS_* / JWT_SECRET / AI_PROVIDER 等

# 初始化表 + 导入种子数据 + 回写默认账号密码
npm run db:init

# 启动（开发模式热重载）
npm run dev
# 或生产
npm run start
```

- 服务默认监听 `http://localhost:3000`
- Swagger 文档：`http://localhost:3000/api-docs`

**默认账号**（由 `db:init` 写入，密码使用 bcrypt 加密）：

| 账号      | 密码         | 角色   |
| ------- | ---------- | ---- |
| `admin` | `admin123` | 管理员  |
| `demo`  | `demo123`  | 普通用户 |

> 忘记密码可用：`node scripts/resetPassword.js <用户名> <新密码>`

### 2. 前端

```bash
cd web
npm install

# 配置（可选，默认代理到 http://localhost:3000）
cp .env.example .env

# 开发
npm run dev        # http://localhost:5173

# 构建生产包
npm run build      # 产物在 web/dist
npm run preview    # 本地预览构建产物
```

---

## AI 能力配置

编辑 `server/.env`：

```env
# mock = 内置离线规则引擎（无需任何 Key，开箱即用）
AI_PROVIDER=mock

# 接大模型：把 AI_PROVIDER 改为 openai / qwen / ernie / deepseek，并填写对应 Key
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# DeepSeek（OpenAI 兼容接口，推荐）
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

AI 参数（限流、模型、开关等）也可在后台「AI 参数配置」页实时调整，立即生效。

---

## 测试

```bash
# 后端冒烟测试（纯逻辑用例，无需数据库）
cd server && npm test -- --offline
```

---

## 更多文档

- [部署文档](docs/部署文档.md)
- [数据库设计](docs/数据库设计.md)
- [API 接口文档](docs/API文档.md)

## License

MIT
