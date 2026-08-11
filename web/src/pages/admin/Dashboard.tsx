/**
 * 后台数据看板
 * 展示核心指标卡片、近 7 天趋势折线图、分类分布环形图与热门文章。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Spin, Button, message as antdMessage, List } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CommentOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { adminApi } from '@/api';
import type { StatsOverview, TrendPoint, StatsDistribution } from '@/types';
import { formatCount } from '@/utils/format';
import './admin.less';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const TICK = 'rgba(140,140,140,0.9)';

export default function Dashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [dist, setDist] = useState<StatsDistribution | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.overview(), adminApi.trend(7), adminApi.distribution()])
      .then(([o, tr, d]) => {
        setOverview(o);
        setTrend(tr);
        setDist(d);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const genSnapshot = async () => {
    try {
      await adminApi.generateSnapshot();
      antdMessage.success(t('admin.snapshotSuccess'));
    } catch {
      /* ignore */
    }
  };

  const stats = overview
    ? [
        { label: t('admin.totalUsers'), value: overview.totalUsers, icon: <UserOutlined /> },
        { label: t('admin.totalBlogs'), value: overview.totalBlogs, icon: <FileTextOutlined /> },
        { label: t('admin.totalComments'), value: overview.totalComments, icon: <CommentOutlined /> },
        { label: t('admin.totalViews'), value: overview.totalViews, icon: <EyeOutlined /> },
      ]
    : [];

  const lineData = {
    labels: trend.map((p) => p.date),
    datasets: [
      {
        label: t('admin.todayPv'),
        data: trend.map((p) => p.pv),
        borderColor: '#1677ff',
        backgroundColor: 'rgba(22,119,255,0.12)',
        fill: true,
        tension: 0.35,
      },
      {
        label: t('admin.todayUv'),
        data: trend.map((p) => p.uv),
        borderColor: '#722ed1',
        backgroundColor: 'rgba(114,46,209,0.1)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const doughnutData = {
    labels: dist?.categories.map((c) => c.name) || [],
    datasets: [
      {
        data: dist?.categories.map((c) => c.value) || [],
        backgroundColor: ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96'],
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: TICK } } },
    scales: {
      x: { ticks: { color: TICK }, grid: { display: false } },
      y: { ticks: { color: TICK }, grid: { color: 'rgba(140,140,140,0.15)' } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: { legend: { position: 'right' as const, labels: { color: TICK } } },
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">{t('admin.dashboard')}</h2>
        <Button icon={<ReloadOutlined />} onClick={load}>
          {t('common.refresh')}
        </Button>
      </div>

      <Spin spinning={loading}>
        <div className="admin-stat-grid">
          {stats.map((s) => (
            <div className="admin-stat" key={s.label}>
              <span className="admin-stat__icon">{s.icon}</span>
              <div className="admin-stat__label">{s.label}</div>
              <div className="admin-stat__value">{formatCount(s.value)}</div>
            </div>
          ))}
          {overview && (
            <div className="admin-stat">
              <span className="admin-stat__icon" style={{ color: '#722ed1' }}>
                <ThunderboltOutlined />
              </span>
              <div className="admin-stat__label">{t('admin.aiCalls')}</div>
              <div className="admin-stat__value">{formatCount(overview.ai.totalCalls)}</div>
            </div>
          )}
        </div>

        <div className="admin-charts">
          <div className="admin-chart-card">
            <div className="admin-chart-card__title">
              {t('admin.trendTitle')}（{t('admin.trendDays', { days: 7 })}）
            </div>
            <Line data={lineData} options={lineOptions} />
          </div>
          <div className="admin-chart-card">
            <div className="admin-chart-card__title">{t('admin.categoryDist')}</div>
            {dist && dist.categories.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div style={{ color: 'var(--c-text-tertiary)', textAlign: 'center', padding: 40 }}>
                {t('common.empty')}
              </div>
            )}
          </div>
        </div>

        <div className="admin-charts">
          <Card
            size="small"
            className="admin-card"
            title={t('admin.sentimentDist')}
          >
            <div className="admin-stat-grid" style={{ marginBottom: 0 }}>
              {dist?.sentiments.map((s) => (
                <div className="admin-stat" key={s.name}>
                  <div className="admin-stat__label">{s.name}</div>
                  <div className="admin-stat__value">{formatCount(s.value)}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card size="small" className="admin-card" title={t('admin.hotBlogs')}>
            <List
              size="small"
              dataSource={dist?.hotBlogs.slice(0, 8) || []}
              renderItem={(b) => (
                <List.Item>
                  <a href={`/blog/${b.id}`} style={{ color: 'var(--c-text)' }}>
                    {b.title}
                  </a>
                  <span style={{ color: 'var(--c-text-tertiary)' }}>{formatCount(b.viewCount)}</span>
                </List.Item>
              )}
            />
          </Card>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button onClick={genSnapshot}>{t('admin.generateSnapshot')}</Button>
        </div>
      </Spin>
    </div>
  );
}
