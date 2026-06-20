import { useTranslation } from 'react-i18next';

const statusConfig = {
  safe: { label: 'Safe', color: 'var(--color-safe)', bg: 'var(--color-safe-dim)', border: 'rgba(0, 255, 135, 0.2)' },
  warning: { label: 'Warning', color: 'var(--color-warning)', bg: 'var(--color-warning-dim)', border: 'rgba(255, 167, 36, 0.2)' },
  unsafe: { label: 'Unsafe', color: 'var(--color-danger)', bg: 'var(--color-danger-dim)', border: 'rgba(255, 71, 87, 0.2)' },
  unknown: { label: 'Unknown', color: 'var(--color-unknown)', bg: 'var(--color-unknown-dim)', border: 'rgba(136, 146, 164, 0.2)' },
};

const SafetyBadge = ({ status = 'unknown', size = 'md' }) => {
  const { t } = useTranslation();
  const cfg = statusConfig[status] || statusConfig.unknown;
  const padding = size === 'sm' ? '3px 10px' : '5px 14px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span className={`safety-badge ${status}`} style={{ padding, fontSize }}>
      <span className="badge-dot" />
      {t(status)}
    </span>
  );
};

export default SafetyBadge;
