-- =====================================================================
-- AI Agent 博客系统 - 数据库初始化脚本
-- 数据库: MySQL 8.0+   字符集: utf8mb4 / utf8mb4_general_ci
-- 使用方式: mysql -u root -p < init.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `ai_blog`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `ai_blog`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. 用户表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username`    VARCHAR(50)     NOT NULL                COMMENT '用户名(登录账号)',
  `email`       VARCHAR(120)    NOT NULL                COMMENT '邮箱',
  `password`    VARCHAR(120)    NOT NULL                COMMENT '密码(bcrypt 加密存储)',
  `nickname`    VARCHAR(50)     NOT NULL DEFAULT ''     COMMENT '昵称',
  `avatar`      VARCHAR(255)    NOT NULL DEFAULT ''     COMMENT '头像URL',
  `bio`         VARCHAR(500)    NOT NULL DEFAULT ''     COMMENT '个人简介',
  `role`        VARCHAR(20)     NOT NULL DEFAULT 'user' COMMENT '角色: user-普通用户 admin-管理员',
  `status`      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态: 1-正常 0-禁用',
  `ai_style`    VARCHAR(20)     NOT NULL DEFAULT 'formal' COMMENT '默认AI创作风格',
  `last_login_at` DATETIME      NULL                    COMMENT '最后登录时间',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------
-- 2. 分类表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name`        VARCHAR(50)  NOT NULL                COMMENT '分类名称',
  `slug`        VARCHAR(60)  NOT NULL                COMMENT '英文别名(URL友好)',
  `description` VARCHAR(255) NOT NULL DEFAULT ''     COMMENT '分类描述',
  `icon`        VARCHAR(60)  NOT NULL DEFAULT ''     COMMENT '图标标识',
  `sort_order`  INT          NOT NULL DEFAULT 0      COMMENT '排序值(越小越前)',
  `blog_count`  INT          NOT NULL DEFAULT 0      COMMENT '博客数量(冗余统计)',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客分类表';

-- ---------------------------------------------------------------------
-- 3. 标签表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tags` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签ID',
  `name`       VARCHAR(40)  NOT NULL                COMMENT '标签名称',
  `color`      VARCHAR(20)  NOT NULL DEFAULT 'blue' COMMENT '展示颜色',
  `ref_count`  INT          NOT NULL DEFAULT 0      COMMENT '被引用次数',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_ref_count` (`ref_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- ---------------------------------------------------------------------
-- 4. 博客表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blogs` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '博客ID',
  `user_id`        BIGINT UNSIGNED NOT NULL                COMMENT '作者ID',
  `category_id`    INT UNSIGNED    NULL                    COMMENT '分类ID',
  `title`          VARCHAR(200)    NOT NULL                COMMENT '标题',
  `summary`        VARCHAR(1000)   NOT NULL DEFAULT ''     COMMENT '摘要(可由AI生成)',
  `content`        LONGTEXT        NOT NULL                COMMENT '正文(Markdown)',
  `cover`          VARCHAR(255)    NOT NULL DEFAULT ''     COMMENT '封面图URL',
  `keywords`       VARCHAR(255)    NOT NULL DEFAULT ''     COMMENT '关键词(逗号分隔, 可由AI提取)',
  `status`         VARCHAR(20)     NOT NULL DEFAULT 'draft' COMMENT '状态: draft-草稿 published-已发布 offline-已下架',
  `audit_status`   VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT '审核状态: pending-待审 pass-通过 reject-驳回',
  `audit_remark`   VARCHAR(500)    NOT NULL DEFAULT ''     COMMENT '审核意见(AI/人工)',
  `is_ai_assisted` TINYINT         NOT NULL DEFAULT 0      COMMENT '是否使用过AI辅助: 1-是 0-否',
  `is_top`         TINYINT         NOT NULL DEFAULT 0      COMMENT '是否置顶',
  `view_count`     INT             NOT NULL DEFAULT 0      COMMENT '浏览量',
  `like_count`     INT             NOT NULL DEFAULT 0      COMMENT '点赞数',
  `comment_count`  INT             NOT NULL DEFAULT 0      COMMENT '评论数',
  `favorite_count` INT             NOT NULL DEFAULT 0      COMMENT '收藏数',
  `word_count`     INT             NOT NULL DEFAULT 0      COMMENT '字数',
  `published_at`   DATETIME        NULL                    COMMENT '发布时间',
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status_pub` (`status`, `published_at`),
  KEY `idx_hot` (`status`, `view_count`),
  FULLTEXT KEY `ft_title_summary` (`title`, `summary`) WITH PARSER ngram,
  CONSTRAINT `fk_blog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blog_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客表';

-- ---------------------------------------------------------------------
-- 5. 博客-标签关联表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_tags` (
  `blog_id` BIGINT UNSIGNED NOT NULL COMMENT '博客ID',
  `tag_id`  INT UNSIGNED    NOT NULL COMMENT '标签ID',
  PRIMARY KEY (`blog_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`),
  CONSTRAINT `fk_bt_blog` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bt_tag`  FOREIGN KEY (`tag_id`)  REFERENCES `tags` (`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客标签关联表';

-- ---------------------------------------------------------------------
-- 6. 评论表(支持二级回复)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评论ID',
  `blog_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属博客ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                COMMENT '评论者ID',
  `parent_id`   BIGINT UNSIGNED NULL                    COMMENT '父评论ID(直接回复对象)',
  `root_id`     BIGINT UNSIGNED NULL                    COMMENT '根评论ID(用于楼中楼聚合)',
  `content`     VARCHAR(2000)   NOT NULL                COMMENT '评论内容',
  `sentiment`   VARCHAR(20)     NOT NULL DEFAULT 'unknown' COMMENT 'AI情感分析: positive/neutral/negative/unknown',
  `sentiment_score` DECIMAL(4,3) NOT NULL DEFAULT 0     COMMENT '情感分值 -1.000 ~ 1.000',
  `status`      VARCHAR(20)     NOT NULL DEFAULT 'normal' COMMENT '状态: normal-正常 hidden-已隐藏 pending-待审核',
  `is_ai_reply` TINYINT         NOT NULL DEFAULT 0      COMMENT '是否AI自动回复',
  `like_count`  INT             NOT NULL DEFAULT 0      COMMENT '点赞数',
  `report_count` INT            NOT NULL DEFAULT 0      COMMENT '被举报次数',
  `ip_region`   VARCHAR(60)     NOT NULL DEFAULT ''     COMMENT 'IP归属地',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_blog_status` (`blog_id`, `status`, `created_at`),
  KEY `idx_user` (`user_id`),
  KEY `idx_root` (`root_id`),
  KEY `idx_sentiment` (`sentiment`),
  CONSTRAINT `fk_cmt_blog` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cmt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- ---------------------------------------------------------------------
-- 7. 点赞表(博客/评论通用)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `likes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `target_type` VARCHAR(20)     NOT NULL COMMENT '目标类型: blog/comment',
  `target_id`   BIGINT UNSIGNED NOT NULL COMMENT '目标ID',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_target` (`user_id`, `target_type`, `target_id`),
  KEY `idx_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞表';

-- ---------------------------------------------------------------------
-- 8. 收藏表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `blog_id`    BIGINT UNSIGNED NOT NULL COMMENT '博客ID',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_blog` (`user_id`, `blog_id`),
  KEY `idx_blog` (`blog_id`),
  CONSTRAINT `fk_fav_blog` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表';

-- ---------------------------------------------------------------------
-- 9. 浏览记录表(用于个性化推荐)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `view_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NULL     COMMENT '用户ID(游客为空)',
  `blog_id`    BIGINT UNSIGNED NOT NULL COMMENT '博客ID',
  `ip`         VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '访问IP',
  `stay_sec`   INT             NOT NULL DEFAULT 0  COMMENT '停留秒数',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `created_at`),
  KEY `idx_blog_time` (`blog_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='浏览记录表';

-- ---------------------------------------------------------------------
-- 10. 举报表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reports` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '举报人ID',
  `target_type` VARCHAR(20)     NOT NULL COMMENT '目标类型: blog/comment',
  `target_id`   BIGINT UNSIGNED NOT NULL COMMENT '目标ID',
  `reason`      VARCHAR(500)    NOT NULL DEFAULT '' COMMENT '举报理由',
  `status`      VARCHAR(20)     NOT NULL DEFAULT 'pending' COMMENT '处理状态: pending/resolved/ignored',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='举报表';

-- ---------------------------------------------------------------------
-- 11. AI 配置表(后台可配置的 AI Agent 参数)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_configs` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key`   VARCHAR(60)  NOT NULL COMMENT '配置键',
  `config_value` TEXT         NOT NULL COMMENT '配置值(字符串/JSON)',
  `value_type`   VARCHAR(20)  NOT NULL DEFAULT 'string' COMMENT '值类型: string/number/boolean/json',
  `description`  VARCHAR(255) NOT NULL DEFAULT '' COMMENT '配置说明',
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI Agent 配置表';

-- ---------------------------------------------------------------------
-- 12. AI 调用日志表(用量统计与成本追踪)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NULL     COMMENT '调用用户ID',
  `action`      VARCHAR(40)     NOT NULL COMMENT 'AI 能力: draft/polish/title/summary/keywords/reply/sentiment/moderate/recommend',
  `provider`    VARCHAR(30)     NOT NULL DEFAULT '' COMMENT '模型厂商',
  `model`       VARCHAR(60)     NOT NULL DEFAULT '' COMMENT '模型名称',
  `prompt_tokens`     INT       NOT NULL DEFAULT 0,
  `completion_tokens` INT       NOT NULL DEFAULT 0,
  `duration_ms` INT             NOT NULL DEFAULT 0  COMMENT '耗时(毫秒)',
  `status`      VARCHAR(20)     NOT NULL DEFAULT 'success' COMMENT 'success/failed',
  `error_msg`   VARCHAR(500)    NOT NULL DEFAULT '',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `created_at`),
  KEY `idx_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日志表';

-- ---------------------------------------------------------------------
-- 13. 敏感词表(内容审核规则可自定义)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sensitive_words` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `word`       VARCHAR(60)  NOT NULL COMMENT '敏感词',
  `category`   VARCHAR(30)  NOT NULL DEFAULT 'other' COMMENT '类别: politics/porn/ad/abuse/other',
  `level`      TINYINT      NOT NULL DEFAULT 1 COMMENT '级别: 1-提示 2-替换 3-拦截',
  `enabled`    TINYINT      NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word` (`word`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词表';

-- ---------------------------------------------------------------------
-- 14. 每日统计表(定时任务写入)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stats_daily` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stat_date`    DATE         NOT NULL COMMENT '统计日期',
  `pv`           INT          NOT NULL DEFAULT 0 COMMENT '页面访问量',
  `uv`           INT          NOT NULL DEFAULT 0 COMMENT '独立访客数',
  `new_users`    INT          NOT NULL DEFAULT 0 COMMENT '新增用户',
  `new_blogs`    INT          NOT NULL DEFAULT 0 COMMENT '新增博客',
  `new_comments` INT          NOT NULL DEFAULT 0 COMMENT '新增评论',
  `ai_calls`     INT          NOT NULL DEFAULT 0 COMMENT 'AI 调用次数',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日统计表';

-- ---------------------------------------------------------------------
-- 15. 站内通知表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                COMMENT '接收者用户ID',
  `type`        VARCHAR(30)     NOT NULL                COMMENT '类型: comment-评论文章 reply-回复评论 like_blog-赞文章 like_comment-赞评论 favorite-收藏文章',
  `actor_id`    BIGINT UNSIGNED NOT NULL                COMMENT '触发者用户ID',
  `blog_id`     BIGINT UNSIGNED NULL                    COMMENT '关联文章ID',
  `comment_id`  BIGINT UNSIGNED NULL                    COMMENT '关联评论ID',
  `target_type` VARCHAR(20)     NULL                    COMMENT '目标类型: blog/comment',
  `target_id`   BIGINT UNSIGNED NULL                    COMMENT '目标ID',
  `is_read`     TINYINT         NOT NULL DEFAULT 0      COMMENT '是否已读: 0-未读 1-已读',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `is_read`, `created_at`),
  KEY `idx_user_time` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内通知表';

-- ---------------------------------------------------------------------
-- 16. 关注关系表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `follows` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `follower_id`  BIGINT UNSIGNED NOT NULL                COMMENT '关注者用户ID',
  `following_id` BIGINT UNSIGNED NOT NULL                COMMENT '被关注者用户ID',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_follow_pair` (`follower_id`, `following_id`),
  KEY `idx_following` (`following_id`),
  KEY `idx_follower` (`follower_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户关注关系表';

SET FOREIGN_KEY_CHECKS = 1;
