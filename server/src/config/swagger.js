/**
 * Swagger / OpenAPI 文档配置
 * 访问地址: http://localhost:3000/api-docs
 *
 * 说明：接口注释以 JSDoc 形式散落在 routes/*.js 中，
 * 这里通过 swagger-jsdoc 扫描汇总生成 OpenAPI 3.0 文档。
 */
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Agent 博客系统 API',
      version: '1.0.0',
      description: [
        '集成 AI Agent 的博客系统后端接口文档。',
        '',
        '**统一响应格式**',
        '```json',
        '{ "code": 0, "message": "success", "data": {} }',
        '```',
        '',
        '**鉴权方式**：在请求头携带 `Authorization: Bearer <token>`，token 由登录接口返回。',
        '',
        '**AI 离线模式**：当 `AI_PROVIDER=mock` 或未配置 API Key 时，',
        '系统使用内置规则引擎产出结果，全部 AI 接口依然可用。',
      ].join('\n'),
      contact: { name: 'AI Blog Team' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: '本地开发环境' },
    ],
    tags: [
      { name: '系统', description: '健康检查等系统级接口' },
      { name: '用户', description: '注册、登录、个人信息' },
      { name: '博客', description: '文章的增删改查与检索' },
      { name: '互动', description: '评论、点赞、收藏、举报' },
      { name: 'AI', description: 'AI Agent 全部能力入口' },
      { name: '分类标签', description: '分类与标签读取' },
      { name: '后台管理', description: '需要管理员权限的接口' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0, description: '0 表示成功，非 0 为业务错误码' },
            message: { type: 'string', example: 'success' },
            data: { type: 'object', nullable: true },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            pageNum: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
          },
        },
      },
    },
  },
  // 扫描带 @swagger 注释的路由文件
  // 注意：glob 只识别正斜杠，Windows 下必须把 \ 归一化为 /，否则扫描不到任何文件
  apis: [path.resolve(__dirname, '../routes').replace(/\\/g, '/') + '/*.js'],
};

module.exports = swaggerJsdoc(options);
