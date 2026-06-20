import { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { alertService } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AlertFeed = ({ limit = 10, showAcknowledge = true }) => {
  const { t } = useTranslation();
  const { on, off } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    alertService.getAll({ limit, acknowledged: false })
      .then((res) => setAlerts(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    const handleNew = (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, limit));
      toast.custom((t) => (
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: `1px solid ${alert.type === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
          borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10,
          alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <AlertTriangle size={18} color={alert.type === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>
              {alert.type === 'critical' ? '🚨 Critical Alert' : '⚠️ Warning'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{alert.message}</div>
          </div>
        </div>
      ), { duration: 5000 });
    };

    on('alert:new', handleNew);
    on('alert:global', handleNew);
    return () => {
      off('alert:new', handleNew);
      off('alert:global', handleNew);
    };
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await alertService.acknowledge(alertId);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      toast.success('Alert acknowledged');
    } catch (e) {
      toast.error('Failed to acknowledge');
    }
  };

  if (loading) return <div className="loader-container"><div className="spinner" /></div>;

  if (!alerts.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
        <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--color-safe)', opacity: 0.5 }} />
        <div style={{ fontWeight: 600 }}>{t('noAlerts')}</div>
      </div>
    );
  }

  return (
    <div>
      {alerts.map((alert) => (
        <div key={alert._id} className={`alert-item ${alert.type}`}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {alert.type === 'critical'
              ? <AlertCircle size={18} color="var(--color-danger)" />
              : <AlertTriangle size={18} color="var(--color-warning)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{alert.message}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>📍 {alert.waterSource?.name}</span>
              <span>🏘️ {alert.village?.name}</span>
              <span>🕐 {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          {showAcknowledge && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleAcknowledge(alert._id)}
              style={{ flexShrink: 0 }}
            >
              {t('acknowledge')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default AlertFeed;
