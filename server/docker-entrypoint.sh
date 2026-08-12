#!/bin/sh
# 后端容器启动入口
# 1. 等待 MySQL 就绪
# 2. 首次启动幂等初始化数据库（建库建表 + 种子数据 + 回写默认账号密码），之后重启跳过
# 3. 启动 Node 服务
set -e

echo "==> 等待 MySQL 就绪 ..."
node wait-for-db.js

# 幂等初始化：仅在首次（无标记文件）执行，避免每次重启清空数据 / 把 admin 密码重置回 admin123
MARKER=/app/uploads/.db_initialized
if [ -f "$MARKER" ]; then
  echo "==> 检测到初始化标记 $MARKER，跳过 db:init（如需重新初始化请删除该标记文件）"
else
  echo "==> 初始化数据库（幂等，重复执行安全）..."
  if node scripts/initDb.js; then
    touch "$MARKER"
    echo "==> 已写入初始化标记 $MARKER"
  else
    echo "[entrypoint] db:init 返回非零，未写入标记，下次启动将重试"
  fi
fi

echo "==> 启动后端服务 ..."
exec node src/server.js
