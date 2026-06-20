import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../contexts/SocketContext';
import { dashboardService, alertService } from '../services/api';
import AlertFeed from '../components/alerts/AlertFeed';
import MonitoringTable from '../components/dashboard/MonitoringTable';
import {
  Droplets, ShieldCheck, AlertTriangle, Activity,
  Radio, Waves, Map, ShieldX,
} from 'lucide-react';
import './DashboardPage.css';

// ── Animated stat card ───────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, value, label, color, bgColor, sublabel, pulse }) => (
  <div className="stat-card animate-fadeInUp" style={{ borderTop: `3px solid ${color}` }}>
    <div className="stat-icon" style={{ background: bgColor }}>
      <Icon size={24} color={color} />
    </div>
    <div className="stat-info">
      <div className="stat-value" style={{ color, transition: 'all 0.4s ease' }}>
        {value ?? '—'}
      </div>
      <div className="stat-label">{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{sublabel}</div>}
    </div>
    {pulse && value > 0 && (
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 8, height: 8, borderRadius: '50%',
        background: color, animation: 'live-pulse 1.5s infinite',
      }} />
    )}
  </div>
);

// ── Main Dashboard ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { t } = useTranslation();
  const { connected, on, off } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    dashboardService.getStats()
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Real-time stat card updates via Socket.IO
  useEffect(() => {
    const handler = (data) => {
      setStats(prev => prev ? {
        ...prev,
        totalSources:    data.totalSources    ?? prev.totalSources,
        safeSources:     data.safeSources     ?? prev.safeSources,
        warningSources:  data.warningSources  ?? prev.warningSources,
        unsafeSources:   data.unsafeSources   ?? prev.unsafeSources,
        unresolvedAlerts: data.unresolvedAlerts ?? prev.unresolvedAlerts,
        readingsToday: (prev.readingsToday || 0) + 1,
        safePercentage: data.totalSources > 0
          ? Math.round((data.safeSources / data.totalSources) * 100)
          : prev.safePercentage,
      } : prev);
    };
    on('stats:update', handler);
    on('sensor:global', () => setStats(prev => prev ? { ...prev, readingsToday: (prev.readingsToday || 0) + 1 } : prev));
    return () => { off('stats:update', handler); };
  }, [on, off]);

  if (loading) return (
    <div className="loader-container" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--color-text-secondary)' }}>Loading dashboard…</span>
    </div>
  );

  const safeColor = stats?.safePercentage >= 80
    ? 'var(--color-safe)'
    : stats?.safePercentage >= 50
    ? 'var(--color-warning)'
    : 'var(--color-danger)';

  return (
    <div className="dashboard-page animate-fadeIn">

      {/* ── Header ── */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">
            <Waves size={26} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            {t('waterQualityMonitoring')}
          </h1>
          <p className="page-subtitle">
            Real-time monitoring across{' '}
            <strong style={{ color: 'var(--color-accent)' }}>{stats?.totalVillages ?? 0}</strong>{' '}
            villages · {stats?.totalSources ?? 0} active sources
          </p>
        </div>
        <div className={`live-indicator ${connected ? '' : 'offline'}`}>
          {connected
            ? <><div className="live-dot" /><span>LIVE</span></>
            : <><Radio size={12} /><span>OFFLINE</span></>}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard
          icon={Map}
          value={stats?.totalVillages}
          label="Total Villages"
          color="var(--color-accent)"
          bgColor="var(--color-accent-dim)"
        />
        <StatCard
          icon={Droplets}
          value={stats?.totalSources}
          label={t('totalSources')}
          color="var(--color-accent)"
          bgColor="var(--color-accent-dim)"
        />
        <StatCard
          icon={ShieldCheck}
          value={stats?.safeSources}
          label={t('safeSources')}
          color="var(--color-safe)"
          bgColor="var(--color-safe-dim)"
          sublabel={stats?.safePercentage != null ? `${stats.safePercentage}% of total` : null}
        />
        <StatCard
          icon={ShieldX}
          value={stats?.unsafeSources}
          label="Unsafe Sources"
          color="var(--color-danger)"
          bgColor="var(--color-danger-dim)"
          pulse
        />
        <StatCard
          icon={AlertTriangle}
          value={stats?.unresolvedAlerts}
          label={t('unresolvedAlerts')}
          color={stats?.unresolvedAlerts > 0 ? 'var(--color-warning)' : 'var(--color-unknown)'}
          bgColor={stats?.unresolvedAlerts > 0 ? 'var(--color-warning-dim)' : 'var(--color-unknown-dim)'}
          pulse={stats?.unresolvedAlerts > 0}
        />
        <StatCard
          icon={Activity}
          value={stats?.readingsToday}
          label={t('readingsToday')}
          color="#8b5cf6"
          bgColor="rgba(139, 92, 246, 0.08)"
        />
      </div>

      {/* ── Safety Percentage Banner ── */}
      {stats && (
        <div className="safety-banner card" style={{ marginBottom: 28 }}>
          <div className="safety-banner-info">
            <span className="safety-pct" style={{ color: safeColor }}>
              {stats.safePercentage}%
            </span>
            <span className="safety-pct-label">
              of monitored sources have safe water right now
            </span>
          </div>
          <div className="safety-bar-track">
            <div
              className="safety-bar-fill"
              style={{
                width: `${stats.safePercentage}%`,
                background: stats.safePercentage >= 80
                  ? 'var(--gradient-safe)'
                  : stats.safePercentage >= 50
                  ? 'var(--gradient-warning)'
                  : 'var(--gradient-danger)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Water Quality Monitoring Table ── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <span className="card-title">💧 Water Quality Monitoring</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {connected && <span style={{ fontSize: 11, color: 'var(--color-safe)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><div className="live-dot" style={{ width: 5, height: 5 }} />Live</span>}
          </div>
        </div>
        <MonitoringTable />
      </div>

      {/* ── Alerts Feed ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔔 {t('alerts')}</span>
          {stats?.unresolvedAlerts > 0 && (
            <span className="alert-badge">{stats.unresolvedAlerts}</span>
          )}
        </div>
        <AlertFeed limit={8} />
      </div>
    </div>
  );
};

export default DashboardPage;
