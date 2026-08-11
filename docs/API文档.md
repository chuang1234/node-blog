# API 接口文档

- 基础前缀：`/api`
- 在线 Swagger：`/api-docs`（OpenAPI 3.0，扫描 `routes/*.js` 的 JSDoc 注解自动生成）
- 统一响应体：`{ code: number, message: string, data: any }`，业务成功 `code === 0`
- 鉴权：除标注「公开」外，均需在请求头携带 `Authorization: Bearer <token>`
- 主要业务错误码：`40101` 未登录 / `40102` token 过期 / `40301` 无权限 / `40401` 不存在 / `42201` 内容违规 / `42901` 限流 / `5000x` 服务/AI/DB 错误

---

## 用户 `users`

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/users/register` | 公开 | 注册（注册成功直接返回 token） |
| POST | `/users/login` | 公开 | 登录 |
| GET | `/users/me` | 登录 | 获取当前用户信息 |
| PUT | `/users/me` | 登录 | 更新资料（昵称/简介/邮箱/头像/AI 风格） |
| PUT | `/users/me/password` | 登录 | 修改密码 |
| POST | `/users/me/avatar` | 登录 | 上传头像 |
| GET | `/users/:id` | 公开 | 查看他人公开主页 |

---

## 博客 `blogs`

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/blogs` | 公开 | 文章列表（分页/关键词/分类/标签/排序） |
| GET | `/blogs/hot` | 公开 | 热门文章 |
| GET | `/blogs/mine` | 登录 | 我的文章（含草稿） |
| GET | `/blogs/:id` | 公开 | 文章详情 |
| GET | `/blogs/:id/related` | 公开 | 相关推荐 |
| POST | `/blogs` | 登录 | 创建文章 |
| PUT | `/blogs/:id` | 登录 | 更新文章 |
| PATCH | `/blogs/:id/status` | 登录 | 修改状态（draft/published/offline） |
| DELETE | `/blogs/:id` | 登录 | 删除文章 |
| POST | `/blogs/cover` | 登录 | 上传封面图 |

---

## 评论与互动

### 评论 `comments`

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/comments/blog/:blogId` | 公开 | 某文章评论列表（分页/排序/情感筛选） |
| POST | `/comments` | 登录 | 发表评论（自动审核 + 情感分析） |
| DELETE | `/comments/:id` | 登录 | 删除评论 |
| POST | `/comments/:id/report` | 登录 | 举报评论 |

### 互动 `interactions`

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/interactions/like/:targetType/:targetId` | 登录 | 点赞/取消（幂等切换，targetType=blog\|comment） |
| POST | `/interactions/favorite/:blogId` | 登录 | 收藏/取消 |
| GET | `/interactions/favorites` | 登录 | 我的收藏列表 |

---

## AI 能力 `ai`

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/ai/status` | 公开 | AI 能力状态（是否开启/模型/配额/是否离线引擎） |
| POST | `/ai/draft` | 登录 | 生成初稿（主题/大纲/风格/语言） |
| POST | `/ai/polish` | 登录 | 润色 |
| POST | `/ai/proofread` | 登录 | 错别字与语病修正 |
| POST | `/ai/restructure` | 登录 | 段落重构 |
| POST | `/ai/title` | 登录 | 标题优化（多候选） |
| POST | `/ai/summary` | 登录 | 智能摘要（长度可选） |
| POST | `/ai/keywords` | 登录 | 关键词提取 |
| POST | `/ai/reply` | 登录 | 生成评论回复（语气可选） |
| POST | `/ai/sentiment` | 登录 | 情感分析 |
| POST | `/ai/moderate` | 登录 | 内容审核 |
| GET | `/ai/topics` | 登录 | 选题灵感推荐 |
| GET | `/ai/recommend` | 公开 | 个性化内容推荐（游客返回热门） |

> AI 接口前端超时 90s；真实模型调用失败会自动降级到离线规则引擎（`degraded: true` 见返回体）。

---

## 分类与标签（公开）

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/categories` | 公开 | 全部分类 |
| GET | `/tags` | 公开 | 全部标签 |
| GET | `/tags/hot` | 公开 | 热门标签 |

---

## 后台管理 `admin`（均需管理员权限）

### 数据看板 `stats`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/stats/overview` | 核心指标概览 |
| GET | `/admin/stats/trend?days=7` | 近期趋势 |
| GET | `/admin/stats/distribution` | 分类/情感/AI 能力分布 + 热门文章 |
| POST | `/admin/stats/snapshot` | 手动生成昨日快照 |

### 用户 `users`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/users` | 用户列表（分页/关键词/角色/状态） |
| PATCH | `/admin/users/:id` | 调整状态 / 角色 |
| DELETE | `/admin/users/:id` | 删除用户（级联删除其文章与评论） |

### 文章 `blogs`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/blogs` | 全部文章列表 |
| PATCH | `/admin/blogs/:id/top` | 置顶/取消 |
| PATCH | `/admin/blogs/:id/status` | 状态调整 |
| DELETE | `/admin/blogs/:id` | 删除 |

### 评论 `comments` / 举报 `reports`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/comments` | 评论列表（关键词/情感/状态筛选） |
| PATCH | `/admin/comments/:id/status` | 隐藏/恢复 |
| DELETE | `/admin/comments/:id` | 删除 |
| GET | `/admin/reports` | 举报列表 |
| PATCH | `/admin/reports/:id` | 处理（resolved/ignored） |

### 分类标签 `categories` / `tags`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/admin/categories` | 新建分类 |
| PUT | `/admin/categories/:id` | 更新分类 |
| DELETE | `/admin/categories/:id` | 删除分类 |
| GET | `/admin/tags` | 标签分页 |
| POST | `/admin/tags` | 新建标签 |
| DELETE | `/admin/tags/:id` | 删除标签 |

### AI 配置 `ai/configs` 与日志 `ai/logs`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/ai/configs` | 全部 AI 参数 |
| PUT | `/admin/ai/configs` | 批量保存（立即生效） |
| GET | `/admin/ai/logs` | AI 调用日志（按能力/状态/用户筛选） |
| GET | `/admin/ai/logs/summary` | 调用日志汇总（总次数/Token/平均耗时/失败数） |

### 敏感词 `words`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/words` | 敏感词列表 |
| POST | `/admin/words` | 新增 |
| PATCH | `/admin/words/:id` | 更新（类别/级别/启用） |
| DELETE | `/admin/words/:id` | 删除 |

---

## 系统

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 公开 | 健康检查（状态/运行时长/缓存模式） |
