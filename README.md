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
├── docker-compose.yml       # 容器编排：db(MySQL) + server(Node) + web(nginx)
├── deploy.sh                # 一键部署脚本（build + up -d）
├── .env.example             # 容器部署环境变量模板（供 docker compose 读取）
├── server/                 # 后端服务
│   ├── Dockerfile          # 后端镜像（node:18-alpine，仅生产依赖）
│   ├── docker-entrypoint.sh # 启动入口：等库就绪 → 幂等 db:init → 启动
│   ├── wait-for-db.js      # 数据库就绪等待脚本
│   ├── .env.example        # 本地开发环境变量模板
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
│   ├── Dockerfile          # 多阶段：node 构建 → nginx:alpine 托管 dist
│   ├── nginx.conf          # SPA 路由回退 + /api、/uploads 反代
│   ├── .env.example        # 本地开发环境变量模板
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

## Docker 容器化部署

不想手动装 Node/MySQL/Nginx？用 Docker Compose 一条命令即可把整套（MySQL + 后端 + 前端 Nginx）跑起来，适合云服务器、轻量应用服务器等场景。完整变量说明见 `docs/部署文档.md`，下面是一键流程。

### 架构

```
            :${HTTP_PORT} (默认 80)
  浏览器 ──► nginx(web 容器)
                 │  /api、/uploads、/api-docs 反代
                 ▼
            server(Node/Express) ──► db(MySQL 8)
                 │ 上传图片落 server_uploads 卷
```

- 前端：`web/Dockerfile` 多阶段构建，产物由 `nginx:alpine` 托管，`web/nginx.conf` 负责 SPA 路由回退与接口反代。
- 后端：`server/Dockerfile` 仅装生产依赖；`docker-entrypoint.sh` 会等数据库就绪 → 幂等执行 `db:init`（建库建表 + 种子 + 回写默认账号）→ 启动。
- 数据持久化：MySQL 数据在 `db_data` 卷、上传图片在 `server_uploads` 卷，容器重建不丢。
- Redis 默认关闭（`REDIS_ENABLED=false`），自动降级为进程内存缓存，单机够用；需要多实例再开启。

### 快速开始

```bash
# 1. 把项目拷贝到服务器（git clone 或 scp）
cd node-blog

# 2. 生成部署环境变量（按需修改）
cp .env.example .env
#   至少改：JWT_SECRET（随机长串）、DB_PASSWORD（强密码）
#   选改：AI_PROVIDER（mock / openai / qwen / ernie / deepseek）

# 3. 一键构建并后台启动
./deploy.sh
```

完成后访问 `http://<服务器IP>:${HTTP_PORT}`（默认 80）；接口文档 `http://<服务器IP>/api-docs`。

> **默认账号**（首次启动由 `db:init` 自动写入，bcrypt 加密）：
> | 账号 | 密码 | 角色 |
> | --- | --- | --- |
> | `admin` | `admin123` | 管理员 |
> | `demo` | `demo123` | 普通用户 |
> 上线前务必改密（后台或 `node server/scripts/resetPassword.js <用户名> <新密码>`）。

### 部署用环境变量（根目录 `.env`）

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `HTTP_PORT` | 对外暴露端口（云安全组需放行） | `80` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 账号 / 密码 / 库名 | `root` / `Chuang@123456` / `ai_blog` |
| `JWT_SECRET` | JWT 签名密钥（**生产必改**） | 占位串 |
| `CORS_ORIGIN` | 跨域白名单（同源填 `*`） | `*` |
| `AI_PROVIDER` | `mock` / `openai` / `qwen` / `ernie` / `deepseek` | `mock` |
| `OPENAI_*` / `QWEN_*` / `DEEPSEEK_*` | 对应大模型 Key 与地址 | 空 |

> 这些变量**只给 `docker compose` 用**，不影响本地开发的 `server/.env` / `web/.env`（那两套是开发模板，见上方「快速开始」）。

### 常用运维命令

```bash
docker compose ps                  # 查看容器状态
docker compose logs -f server      # 跟踪后端日志
docker compose down                # 停止并移除容器（数据卷保留）
docker compose up -d --build       # 代码更新后重新构建并启动
docker compose restart web         # 仅重启前端（如改了 nginx.conf）
```

### HTTPS 与备案（上公网必看）

- `web/nginx.conf` 已预留 `listen 443 ssl` 注释段：把证书放到 `/etc/nginx/certs` 并在 `docker-compose.yml` 挂载该目录即可启用 HTTPS。
- 服务器在中国大陆需 **ICP 备案**（免费，个人可备），前提：已购大陆服务器 + 域名已实名。评论区属 UGC，备案口径较严，必要时可临时关闭评论开关。

---

## AI 能力配置

> **Docker 部署**：AI 配置由根目录 `.env` 经 `docker-compose.yml` 注入容器（见上方「Docker 容器化部署」环境变量表），**改容器内或宿主机的 `server/.env` 均不生效**。改完根 `.env` 后执行 `docker compose up -d --force-recreate server` 重启后端即可生效。本地开发才改 `server/.env`。

编辑 `server/.env`（本地开发模式）：

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
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
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
