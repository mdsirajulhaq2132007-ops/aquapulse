import { useEffect, useState } from 'react';
import { analyticsService, sourceService } from '../services/api';
import TrendChart from '../components/analytics/TrendChart';
import { BarChart3, TrendingUp, Droplets, Thermometer, Waves } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Custom Tooltip shared by all charts ─────────────────────────────────────
const LightTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #cbd5e1',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── Small section heading ────────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, color, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <Icon size={16} color={color} />
    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{children}</span>
  </div>
);

// ── Main Analytics Page ──────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [overview, setOverview]         = useState(null);
  const [trends, setTrends]             = useState([]);
  const [sources, setSources]           = useState([]);
  const [villageHealth, setVillageHealth] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [range, setRange]               = useState('7d');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.getOverview(),
      analyticsService.getVillageHealth(),
      sourceService.getAll(),
    ]).then(([ovRes, vhRes, sRes]) => {
      setOverview(ovRes.data.data);
      setVillageHealth(vhRes.data.data);
      setSources(sRes.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = { range };
    if (selectedSource) params.sourceId = selectedSource;
    analyticsService.getTrends(params)
      .then(res => setTrends(res.data.data))
      .catch(console.error);
  }, [range, selectedSource]);

  if (loading) return <div className="loader-container"><div className="spinner" /></div>;

  // Pie chart data
  const pieData = overview ? [
    { name: 'Safe',    value: overview.safeSources,    color: '#10b981' },
    { name: 'Warning', value: overview.warningSources, color: '#f59e0b' },
    { name: 'Unsafe',  value: overview.unsafeSources,  color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const totalPieSources = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <BarChart3 size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Analytics
        </h1>
        <p className="page-subtitle">Trends, patterns, and village health insights</p>
      </div>

      {/* ── Row 1: Safe/Unsafe Pie + Village Health Bar ── */}
      <div className="content-grid" style={{ marginBottom: 24 }}>
        {/* Pie chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Safe vs Unsafe Sources</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{totalPieSources} total</span>
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={78}
                    dataKey="value" stroke="none"
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.name}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: d.color }}>{d.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      ({Math.round((d.value / totalPieSources) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No source data yet
            </div>
          )}
        </div>

        {/* Village health bar chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Village Health Overview</span>
          </div>
          {villageHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={villageHealth} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="village.name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<LightTooltip />} formatter={v => [`${v}%`, 'Health']} />
                <Bar dataKey="healthScore" radius={[6, 6, 0, 0]} fill="url(#barGrad)"
                  label={{ position: 'top', fill: 'var(--color-text-secondary)', fontSize: 11, formatter: v => `${v}%` }} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No village data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Trend chart controls ── */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <TrendingUp size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 700, fontSize: 14, marginRight: 4 }}>Parameter Trends</span>
          <select
            className="form-select"
            style={{ width: 200, padding: '8px 12px', fontSize: 13 }}
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
          >
            <option value="">All Sources</option>
            {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {['24h', '7d', '30d'].map(r => (
              <button
                key={r}
                className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: 3 Separate Trend Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

        {/* pH Trend */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <SectionTitle icon={Droplets} color="#10b981">pH Level Trend</SectionTitle>
            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 500 }}>— Safe: 6.5–8.5</span>
              <span style={{ color: '#ef4444', fontWeight: 500 }}>— Danger: &lt;6.0 | &gt;9.0</span>
            </div>
          </div>
          <TrendChart data={trends} param="ph" />
        </div>

        {/* Turbidity Trend */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <SectionTitle icon={Waves} color="#2563eb">Turbidity Trend (NTU)</SectionTitle>
            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 500 }}>— Safe: &lt;1 NTU</span>
              <span style={{ color: '#ef4444', fontWeight: 500 }}>— Danger: &gt;4 NTU</span>
            </div>
          </div>
          <TrendChart data={trends} param="turbidity" />
        </div>

        {/* Temperature Trend */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <SectionTitle icon={Thermometer} color="#f59e0b">Temperature Trend (°C)</SectionTitle>
            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <span style={{ color: '#10b981', fontWeight: 500 }}>— Safe: 10–25°C</span>
              <span style={{ color: '#ef4444', fontWeight: 500 }}>— Danger: &lt;5°C | &gt;30°C</span>
            </div>
          </div>
          <TrendChart data={trends} param="temperature" />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
