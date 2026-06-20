import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sourceService, sensorService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import RealTimeMeter from '../components/dashboard/RealTimeMeter';
import SafetyBadge from '../components/common/SafetyBadge';
import TrendChart from '../components/analytics/TrendChart';
import { ArrowLeft, Activity, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SourceDetailPage = () => {
  const { id } = useParams();
  const { on, off, joinSource } = useSocket();
  const [source, setSource] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeParam, setActiveParam] = useState('ph');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sourceService.getById(id),
      sensorService.getLatest(id),
      sensorService.getHistory(id, { limit: 50 }),
      sourceService.getStats(id, '7d'),
    ]).then(([sRes, lRes, hRes, stRes]) => {
      setSource(sRes.data.data);
      setLatestReading(lRes.data.data);
      setHistory(hRes.data.data);
      setStats(stRes.data.data);
    }).catch(console.error).finally(() => setLoading(false));

    joinSource(id);
    const handler = (data) => {
      if (data.sourceId === id || data.sourceId?.toString() === id) {
        setLatestReading(data.reading);
      }
    };
    on('sensor:update', handler);
    return () => off('sensor:update', handler);
  }, [id]);

  if (loading) return <div className="loader-container"><div className="spinner" /></div>;
  if (!source) return <div className="page-header"><p>Source not found.</p></div>;

  const reading = latestReading || source.lastReadingValues;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <Link to="/" className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">{source.name}</h1>
            <p className="page-subtitle">
              📍 {source.village?.name}, {source.village?.district} · Device: {source.deviceId || 'N/A'}
            </p>
          </div>
          <SafetyBadge status={source.safetyStatus} />
        </div>
      </div>

      {/* Live gauges */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">
            <Activity size={16} style={{ marginRight: 6 }} />
            Live Readings
          </span>
          {latestReading?.timestamp && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Updated {formatDistanceToNow(new Date(latestReading.timestamp), { addSuffix: true })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0' }}>
          <RealTimeMeter param="ph" value={reading?.ph} size={160} />
          <RealTimeMeter param="turbidity" value={reading?.turbidity} size={160} />
          <RealTimeMeter param="temperature" value={reading?.temperature} size={160} />
        </div>
      </div>

      {/* Stats summary */}
      {stats && Object.keys(stats).length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Avg pH', value: stats.avgPh?.toFixed(2) },
            { label: 'Avg Turbidity', value: stats.avgTurbidity?.toFixed(2) + ' NTU' },
            { label: 'Avg Temperature', value: stats.avgTemperature?.toFixed(1) + '°C' },
            { label: 'Total Readings (7d)', value: stats.totalReadings },
            { label: 'Unsafe Readings', value: stats.unsafeCount, danger: stats.unsafeCount > 0 },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-info">
                <div className="stat-value" style={{ fontSize: 22, color: s.danger ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                  {s.value ?? '--'}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><BarChart2 size={16} style={{ marginRight: 6 }} /> 7-Day Trends</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ph', 'turbidity', 'temperature'].map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${activeParam === p ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveParam(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <TrendChart data={history.map((r) => ({
            timestamp: r.timestamp,
            [`avg${activeParam.charAt(0).toUpperCase() + activeParam.slice(1)}`]: r[activeParam],
          }))} param={activeParam} />
        </div>
      )}
    </div>
  );
};

export default SourceDetailPage;
