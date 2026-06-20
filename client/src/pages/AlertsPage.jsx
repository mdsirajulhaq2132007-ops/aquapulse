import { useEffect, useState } from 'react';
import { alertService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import SafetyBadge from '../components/common/SafetyBadge';
import { AlertTriangle, AlertCircle, CheckCircle, Bell, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AlertsPage = () => {
  const { t } = useTranslation();
  const { on, off } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ acknowledged: false, type: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filter };
      if (!filter.type) delete params.type;
      const [aRes, sRes] = await Promise.all([alertService.getAll(params), alertService.getStats()]);
      setAlerts(aRes.data.data);
      setPagination(aRes.data.pagination);
      setStats(sRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filter, page]);

  useEffect(() => {
    const handler = (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      setStats((prev) => prev ? { ...prev, unacknowledged: prev.unacknowledged + 1, total: prev.total + 1 } : prev);
    };
    on('alert:new', handler);
    on('alert:global', handler);
    return () => { off('alert:new', handler); off('alert:global', handler); };
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await alertService.acknowledge(id);
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, acknowledged: true } : a));
      toast.success('Alert acknowledged');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title"><Bell size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('alertsTitle')}</h1>
        <p className="page-subtitle">Monitor and acknowledge water quality alerts</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid stagger-children" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Alerts', value: stats.total, color: 'var(--color-accent)' },
            { label: 'Unacknowledged', value: stats.unacknowledged, color: 'var(--color-warning)' },
            { label: 'Critical', value: stats.critical, color: 'var(--color-danger)' },
          ].map((s) => (
            <div key={s.label} className="stat-card animate-fadeInUp">
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={16} color="var(--color-text-secondary)" />
        <select className="form-select" style={{ width: 160 }} value={filter.type}
          onChange={(e) => { setFilter({ ...filter, type: e.target.value }); setPage(1); }}>
          <option value="">All Types</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
        </select>
        <select className="form-select" style={{ width: 180 }}
          value={filter.acknowledged === false ? 'false' : 'true'}
          onChange={(e) => { setFilter({ ...filter, acknowledged: e.target.value === 'true' }); setPage(1); }}>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>
      </div>

      {/* Alert list */}
      <div className="card">
        {loading ? (
          <div className="loader-container"><div className="spinner" /></div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)' }}>
            <CheckCircle size={48} style={{ marginBottom: 12, color: 'var(--color-safe)', opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('noAlerts')}</div>
            <div style={{ fontSize: 13 }}>All water sources are operating within safe parameters.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Source</th>
                <th>Village</th>
                <th>Parameter</th>
                <th>Value</th>
                <th>Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id}>
                  <td>
                    {alert.type === 'critical'
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontWeight: 600 }}><AlertCircle size={14} />Critical</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-warning)', fontWeight: 600 }}><AlertTriangle size={14} />Warning</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{alert.waterSource?.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{alert.village?.name}</td>
                  <td style={{ textTransform: 'capitalize', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{alert.parameter}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}>{alert.value?.toFixed(2)}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </td>
                  <td>
                    {alert.acknowledged
                      ? <span style={{ fontSize: 12, color: 'var(--color-safe)' }}>✓ Done</span>
                      : <SafetyBadge status="unsafe" size="sm" />}
                  </td>
                  <td>
                    {!alert.acknowledged && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAcknowledge(alert._id)}>
                        {t('acknowledge')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0', borderTop: '1px solid var(--color-border)' }}>
            {[...Array(pagination.pages)].map((_, i) => (
              <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
