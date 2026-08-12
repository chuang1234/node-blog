#!/usr/bin/env bash
#
# AI Agent 博客系统 · 一键部署脚本
# 前置：已安装 Docker 与 Docker Compose v2（或旧版 docker-compose）
#
set -euo pipefail

cd "$(dirname "$0")"

# ---------- 选择 compose 命令 ----------
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "✗ 未检测到 Docker Compose，请先安装 Docker Desktop 或 docker-compose" >&2
  exit 1
fi

echo "==> 使用命令: $DC"

# ---------- 准备 compose 环境变量 ----------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ 已生成 .env（默认配置可直接用，生产请修改 JWT_SECRET / DB_PASSWORD / AI_*）"
fi

# ---------- 构建并启动 ----------
echo "==> 构建镜像 ..."
$DC build

echo "==> 启动服务（后台）..."
$DC up -d

# 等待一小会儿让容器进入运行状态
sleep 5

echo ""
echo "==> 服务状态 =="
$DC ps

echo ""
echo "=============================================="
echo " 部署完成 🎉"
echo " 站点地址 :  http://localhost:${HTTP_PORT:-80}"
echo " 接口文档 :  http://localhost:${HTTP_PORT:-80}/api-docs"
echo " 默认账号 :  admin / admin123  (管理员)"
echo "            demo / demo123   (普通用户)"
echo " 提示     :  上线后请尽快修改默认密码与 JWT_SECRET"
echo "=============================================="
echo ""
echo "常用命令："
echo "  查看后端日志 :  $DC logs -f server"
echo "  停止服务     :  $DC down"
echo "  更新代码重新部署: git pull && ./deploy.sh"
echo "  重建单个服务 :  $DC up -d --build server"
