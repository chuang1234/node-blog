-- =====================================================================
-- 迁移：新增站内通知表 notifications
-- 适用：已初始化过数据库、但缺少 notifications 表的运行环境
-- 用法：mysql -u root -p ai_blog < migrate_2026-08-12_notifications.sql
--       或在容器内执行：
--       docker compose exec server node -e "require('./src/config/db')"
--       （推荐直接用 mysql 客户端执行本文件）
-- 说明：CREATE TABLE IF NOT EXISTS，可重复执行，不会破坏已有数据
-- =====================================================================

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
