-- =====================================================================
-- 关注关系表迁移（2026-08-12）
-- 用途: 已初始化（旧库因 Docker 入口脚本的首次初始化标记，不会自动建表）
--       的数据库需手动执行本脚本创建 follows 表。
-- 用法: mysql -u root -p ai_blog < migrate_2026-08-12_follows.sql
--       （或 docker compose exec db mysql -u root -p ai_blog < 本文件）
-- 安全: 全表 IF NOT EXISTS，可重复执行。
-- =====================================================================

USE `ai_blog`;

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
