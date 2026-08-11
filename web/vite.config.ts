import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite 构建配置
 * - @ 别名指向 src，避免深层相对路径
 * - 开发环境代理 /api 与 /uploads 到后端，规避跨域
 * - 生产构建按依赖体积拆包，减小首屏 chunk
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          // 全局注入变量与混入，各页面 .less 中可直接使用
          additionalData: `@import "${path
            .resolve(__dirname, 'src/styles/variables.less')
            .replace(/\\/g, '/')}";`,
        },
      },
    },

    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        // 后端上传的头像、封面图
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 手动分包：把体积大且更新频率低的依赖单独抽出，提升缓存命中率
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-antd': ['antd', '@ant-design/icons'],
            'vendor-editor': ['react-quill', 'react-markdown', 'remark-gfm', 'rehype-raw'],
            'vendor-chart': ['chart.js', 'react-chartjs-2'],
            'vendor-state': ['@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
  };
});
