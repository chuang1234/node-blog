#!/bin/sh
# 后端容器启动入口
# 1. 等待 MySQL 就绪
# 2. 幂等初始化数据库（建库建表 + 种子数据 + 回写默认账号密码）
# 3. 启动 Node 服务
set -e

echo "==> 等待 MySQL 就绪 ..."
node wait-for-db.js

echo "==> 初始化数据库（幂等，重复执行安全）..."
# db:init 失败仅打印告警不阻断（例如库已存在）；用 || 防止非零退出中断启动
node scripts/initDb.js || echo "[entrypoint] db:init 返回非零，已忽略（可能已初始化）"

echo "==> 启动后端服务 ..."
exec node src/server.js
