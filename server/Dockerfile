# 后端镜像：基于 Node 18 Alpine，仅安装生产依赖
FROM node:18-alpine

WORKDIR /app

# 先装依赖（利用层缓存，源码变动时不重新 install）
COPY package*.json ./
RUN npm ci --omit=dev

# 复制源码与脚本
COPY . .

# 入口脚本需要可执行权限
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
