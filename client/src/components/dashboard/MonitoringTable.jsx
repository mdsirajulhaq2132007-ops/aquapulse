import { useEffect, useState, useMemo } from 'react';
import { readingsService } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter, Droplets, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  safe:    { label: 'SAFE',    bg: '#ecfdf5', color: '#10b981', border: '#d1fae5' },
  warning: { label: 'WARNING', bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
  unsafe:  { label: 'UNSAFE',  bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
  unknown: { label: 'UNKNOWN', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

const Skeleton = () => (
  <tr>
    {[...Array(8)].map((_, i) => (
      <td key={i}>
        <div style={{ height: 14, borderRadius: 4, background: 'var(--color-border)', animation: 'shimmer-pulse 1.4s ease infinite', animationDelay: `${i * 0.07}s` }} />
      </td>
    ))}
  </tr>
);

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const Mono = ({ children, color }) => (
  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: color || 'var(--color-text-primary)' }}>
    {children}
  </span>
);

const MonitoringTable = () => {
  const { on, off } = useSocket();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastRefresh, setLastRefresh]   = useState(null);

  const fetchLatest = () => {
    readingsService.getLatestPerSource()
      .then(res => {
        setRows(res.data.data);
        setLastRefresh(new Date());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLatest(); }, []);

  // Real-time updates: when a new reading comes in, update that row
  useEffect(() => {
    const handler = (payload) => {
      setRows(prev => {
        const idx = prev.findIndex(r =>
          r.waterSource?.toString() === payload.sourceId?.toString() ||
          r.waterSource === payload.sourceId
        );
        const updated = {
          waterSource: payload.sourceId,
          sourceName: payload.sourceName,
          villageName: payload.reading?.villageName || prev[idx]?.villageName,
          villageDistrict: prev[idx]?.villageDistrict,
          deviceId: prev[idx]?.deviceId || payload.reading?.deviceId,
          ph: payload.reading.ph,
          turbidity: payload.reading.turbidity,
          temperature: payload.reading.temperature,
          safetyStatus: payload.reading.safetyStatus,
          timestamp: payload.reading.timestamp,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
      setLastRefresh(new Date());
    };
    on('sensor:global', handler);
    return () => off('sensor:global', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      const matchSearch = !q ||
        (r.sourceName || '').toLowerCase().includes(q) ||
        (r.villageName || '').toLowerCase().includes(q) ||
        (r.deviceId || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.safetyStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

  const paramColor = (param, value) => {
    if (param === 'ph') {
      if (value < 6.0 || value > 8.0) return '#ef4444';
      return '#10b981';
    }
    if (param === 'turbidity') {
      return 'var(--color-text-primary)';
    }
    if (param === 'temperature') {
      if (value < 5 || value > 30) return '#ef4444';
      if (value < 10 || value > 25) return '#f59e0b';
      return '#2563eb';
    }
    return 'var(--color-text-primary)';
  };

  return (
    <div>
      {/* Table Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }}
            placeholder="Search source, village, device…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--color-text-muted)" />
          <select
            className="form-select"
            style={{ width: 140, padding: '9px 12px', fontSize: 13 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="safe">🟢 Safe</option>
            <option value="warning">🟡 Warning</option>
            <option value="unsafe">🔴 Unsafe</option>
            <option value="unknown">⚫ Unknown</option>
          </select>
        </div>
        <button
          className="btn btn-secondary"
          style={{ padding: '9px 14px', fontSize: 13 }}
          onClick={() => { setLoading(true); fetchLatest(); }}
        >
          <RefreshCw size={13} />
        </button>
        {lastRefresh && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <table className="data-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>Source Name</th>
              <th>Village</th>
              <th>Device ID</th>
              <th>pH</th>
              <th>Turbidity (NTU)</th>
              <th>Temp (°C)</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <Skeleton /><Skeleton /><Skeleton /><Skeleton /><Skeleton />
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                    <Droplets size={32} style={{ marginBottom: 10, opacity: 0.25 }} />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {rows.length === 0 ? 'No sensor readings yet' : 'No matching results'}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {rows.length === 0
                        ? 'Send a reading from an ESP32 device to see data here.'
                        : 'Try adjusting your search or filter.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.waterSource?.toString() || i} style={{ transition: 'background 0.2s' }}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    💧 {row.sourceName || '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    {row.villageName || '—'}
                    {row.villageDistrict && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>· {row.villageDistrict}</span>}
                  </td>
                  <td>
                    <Mono color="var(--color-accent)">{row.deviceId || '—'}</Mono>
                  </td>
                  <td>
                    <Mono color={paramColor('ph', row.ph)}>
                      {row.ph !== undefined ? row.ph.toFixed(2) : '—'}
                    </Mono>
                  </td>
                  <td>
                    <Mono color={paramColor('turbidity', row.turbidity)}>
                      {row.turbidity !== undefined ? row.turbidity.toFixed(2) : '—'}
                    </Mono>
                  </td>
                  <td>
                    <Mono color={paramColor('temperature', row.temperature)}>
                      {row.temperature !== undefined ? row.temperature.toFixed(1) : '—'}
                    </Mono>
                  </td>
                  <td><StatusPill status={row.safetyStatus} /></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    {row.timestamp
                      ? formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
          Showing {filtered.length} of {rows.length} source{rows.length !== 1 ? 's' : ''}
        </div>
      )}

      <style>{`
        @keyframes shimmer-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default MonitoringTable;
