import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { villageService, sourceService, alertService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import SafetyBadge from '../components/common/SafetyBadge';
import RealTimeMeter from '../components/dashboard/RealTimeMeter';
import {
  ArrowLeft, MapPin, Users, Droplets, AlertTriangle,
  Activity, Clock, Cpu, ChevronRight, CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './VillageDetailPage.css';

/* ─── small inline source card ──────────────────────────────────────────── */
const SourceRow = ({ source }) => {
  const r = source.lastReadingValues || {};
  const ago = source.lastReading
    ? formatDistanceToNow(new Date(source.lastReading), { addSuffix: true })
    : 'No reading yet';

  const typeEmoji = { well: '🪣', borewell: '🔩', tap: '🚰', pond: '🏞️', spring: '💧', river: '🌊' };

  return (
    <div className={`vd-source-card status-${source.safetyStatus || 'unknown'}`}>
      {/* Header row */}
      <div className="vd-source-header">
        <div className="vd-source-name">
          <span style={{ fontSize: 20 }}>{typeEmoji[source.type] || '💧'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{source.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Cpu size={11} /> {source.deviceId || 'No device'}
              &nbsp;·&nbsp;
              <span style={{ textTransform: 'capitalize' }}>{source.type}</span>
            </div>
          </div>
        </div>
        <SafetyBadge status={source.safetyStatus} />
      </div>

      {/* Gauge row */}
      {r.ph !== undefined ? (
        <div className="vd-gauges">
          <RealTimeMeter param="ph"          value={r.ph}          size={120} />
          <RealTimeMeter param="turbidity"   value={r.turbidity}   size={120} />
          <RealTimeMeter param="temperature" value={r.temperature} size={120} />
        </div>
      ) : (
        <div className="vd-no-reading">
          <Activity size={24} style={{ opacity: 0.3 }} />
          <span>Awaiting first sensor reading…</span>
        </div>
      )}

      {/* Footer row */}
      <div className="vd-source-footer">
        <div className="vd-last-update">
          <Clock size={12} /> {ago}
        </div>
        <Link to={`/sources/${source._id}`} className="btn btn-secondary btn-sm">
          Full Details <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
};

/* ─── Main page ──────────────────────────────────────────────────────────── */
const VillageDetailPage = () => {
  const { id } = useParams();
  const { on, off, joinVillage } = useSocket();

  const [village, setVillage]   = useState(null);
  const [sources, setSources]   = useState([]);
  const [alerts,  setAlerts]    = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      villageService.getById(id),
      sourceService.getAll({ village: id }),
      alertService.getAll({ village: id, acknowledged: false, limit: 8 }),
    ]).then(([vRes, sRes, aRes]) => {
      setVillage(vRes.data.data);
      setSources(sRes.data.data);
      setAlerts(aRes.data.data);
    }).catch(console.error)
      .finally(() => setLoading(false));

    joinVillage(id);

    // Live: update a specific source card when new reading arrives
    const handleUpdate = (data) => {
      setSources(prev => prev.map(s =>
        s._id === data.sourceId || s._id?.toString() === data.sourceId
          ? {
              ...s,
              safetyStatus: data.reading?.safetyStatus || s.safetyStatus,
              lastReading: data.reading?.timestamp,
              lastReadingValues: {
                ph: data.reading?.ph,
                turbidity: data.reading?.turbidity,
                temperature: data.reading?.temperature,
              },
            }
          : s
      ));
    };

    const handleAlert = (alert) => {
      if (alert.village === id || alert.village?._id === id) {
        setAlerts(prev => [alert, ...prev].slice(0, 8));
      }
    };

    on('sensor:update', handleUpdate);
    on('alert:new', handleAlert);
    return () => { off('sensor:update', handleUpdate); off('alert:new', handleAlert); };
  }, [id]);

  if (loading) return <div className="loader-container" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
  if (!village) return (
    <div className="page-header">
      <Link to="/villages" className="btn btn-secondary btn-sm"><ArrowLeft size={14} /> Back</Link>
      <p style={{ marginTop: 20, color: 'var(--color-text-muted)' }}>Village not found.</p>
    </div>
  );

  // Derived stats
  const safeCount    = sources.filter(s => s.safetyStatus === 'safe').length;
  const warnCount    = sources.filter(s => s.safetyStatus === 'warning').length;
  const unsafeCount  = sources.filter(s => s.safetyStatus === 'unsafe').length;
  const overallHealth = unsafeCount > 0 ? 'unsafe' : warnCount > 0 ? 'warning' : sources.length > 0 ? 'safe' : 'unknown';
  const safePct = sources.length ? Math.round((safeCount / sources.length) * 100) : 0;

  return (
    <div className="animate-fadeIn">
      {/* ── Back + header ── */}
      <Link to="/villages" className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> All Villages
      </Link>

      <div className="vd-header">
        <div className="vd-title-block">
          <h1 className="page-title">{village.name}</h1>
          <div className="vd-meta">
            <span><MapPin size={13} /> {village.district}, {village.state}</span>
            <span><Users size={13} /> {village.population?.toLocaleString() || '—'} people</span>
            {village.description && <span>📝 {village.description}</span>}
            {village.coordinates?.lat && (
              <span>🌐 {village.coordinates.lat.toFixed(4)}, {village.coordinates.lng.toFixed(4)}</span>
            )}
          </div>
        </div>
        <SafetyBadge status={overallHealth} />
      </div>

      {/* ── Stats row ── */}
      <div className="vd-stats stagger-children">
        {[
          { label: 'Total Sources',  value: sources.length,   color: 'var(--color-accent)'  },
          { label: '✅ Safe',        value: safeCount,         color: 'var(--color-safe)'    },
          { label: '⚠️ Warning',     value: warnCount,         color: 'var(--color-warning)' },
          { label: '❌ Unsafe',      value: unsafeCount,       color: unsafeCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' },
          { label: 'Open Alerts',   value: alerts.length,    color: alerts.length > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' },
        ].map(s => (
          <div key={s.label} className="stat-card animate-fadeInUp">
            <div className="stat-info">
              <div className="stat-value" style={{ fontSize: 26, color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Safety bar ── */}
      {sources.length > 0 && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 32, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
              color: safePct >= 80 ? 'var(--color-safe)' : safePct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}>{safePct}%</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 140, lineHeight: 1.4 }}>
              of {village.name} sources have safe water
            </span>
          </div>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 1s ease',
              width: `${safePct}%`,
              background: safePct >= 80 ? 'var(--gradient-safe)' : safePct >= 50 ? 'var(--gradient-warning)' : 'var(--gradient-danger)',
            }} />
          </div>
        </div>
      )}

      {/* ── Main content: Sources + Alerts ── */}
      <div className="content-grid">

        {/* Sources column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              <Droplets size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--color-accent)' }} />
              Water Sources
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{sources.length} total</span>
          </div>

          {sources.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)' }}>
              <Droplets size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontWeight: 600 }}>No water sources yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Add sources from the Villages page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sources.map((source, i) => (
                <div key={source._id} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.07}s` }}>
                  <SourceRow source={source} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--color-warning)' }} />
              Open Alerts
            </h2>
            {alerts.length > 0 && (
              <span style={{ background: 'var(--color-danger)', color: 'white', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 100 }}>{alerts.length}</span>
            )}
          </div>

          <div className="card">
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--color-safe)', opacity: 0.4 }} />
                <div style={{ fontWeight: 600 }}>All clear!</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>No open alerts for {village.name}</div>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert._id} className={`alert-item ${alert.type}`}>
                  <div style={{ flexShrink: 0 }}>
                    {alert.type === 'critical'
                      ? <AlertTriangle size={16} color="var(--color-danger)" />
                      : <AlertTriangle size={16} color="var(--color-warning)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{alert.message}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>💧 {alert.waterSource?.name}</span>
                      <span>🕐 {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            {alerts.length > 0 && (
              <Link to="/alerts" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                View All Alerts →
              </Link>
            )}
          </div>

          {/* Village info card */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <span className="card-title">📋 Village Info</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Name',        village.name],
                  ['District',    village.district],
                  ['State',       village.state],
                  ['Population',  village.population?.toLocaleString() || '—'],
                  ['Water Sources', `${sources.length} monitored`],
                  ['Coordinates', village.coordinates?.lat
                    ? `${village.coordinates.lat.toFixed(4)}, ${village.coordinates.lng.toFixed(4)}`
                    : '—'],
                  ['Created',     new Date(village.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--color-text-secondary)', fontWeight: 600, width: '40%' }}>{k}</td>
                    <td style={{ padding: '10px 0', color: 'var(--color-text-primary)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillageDetailPage;
