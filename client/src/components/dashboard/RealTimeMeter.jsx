import { useMemo } from 'react';

const PARAM_CONFIG = {
  ph: {
    min: 0, max: 14,
    safeMin: 6.5, safeMax: 8.5,
    warnMin: 6.0, warnMax: 9.0,
    unit: '',
    label: 'pH',
    color: { safe: '#10b981', warning: '#f59e0b', unsafe: '#ef4444' },
  },
  turbidity: {
    min: 0, max: 10,
    safeMin: 0, safeMax: 1,
    warnMin: 0, warnMax: 4,
    unit: 'NTU',
    label: 'Turbidity',
    color: { safe: '#10b981', warning: '#f59e0b', unsafe: '#ef4444' },
  },
  temperature: {
    min: 0, max: 40,
    safeMin: 10, safeMax: 25,
    warnMin: 5, warnMax: 30,
    unit: '°C',
    label: 'Temperature',
    color: { safe: '#2563eb', warning: '#f59e0b', unsafe: '#ef4444' },
  },
};

const getStatus = (param, value) => {
  const cfg = PARAM_CONFIG[param];
  if (!cfg) return 'unknown';
  if (param === 'turbidity') {
    if (value > cfg.warnMax) return 'unsafe';
    if (value > cfg.safeMax) return 'warning';
    return 'safe';
  }
  if (value < cfg.warnMin || value > cfg.warnMax) return 'unsafe';
  if (value < cfg.safeMin || value > cfg.safeMax) return 'warning';
  return 'safe';
};

const RealTimeMeter = ({ param, value, size = 160 }) => {
  const cfg = PARAM_CONFIG[param];
  if (!cfg) return null;

  const status = getStatus(param, value ?? cfg.safeMin);
  const color = cfg.color[status] || '#8892a4';

  const { arcPath, valuePath } = useMemo(() => {
    const cx = size / 2, cy = size / 2;
    const r = size * 0.38;
    const startAngle = -210;
    const sweepAngle = 240;
    const normalized = Math.min(Math.max((value ?? cfg.safeMin) - cfg.min, 0), cfg.max - cfg.min) / (cfg.max - cfg.min);
    const valueAngle = startAngle + sweepAngle * normalized;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const polar = (angle, radius) => ({
      x: cx + radius * Math.cos(toRad(angle)),
      y: cy + radius * Math.sin(toRad(angle)),
    });

    const start = polar(startAngle, r);
    const end = polar(startAngle + sweepAngle, r);
    const valEnd = polar(valueAngle, r);
    const largeArc = sweepAngle > 180 ? 1 : 0;
    const valLargeArc = sweepAngle * normalized > 180 ? 1 : 0;

    return {
      arcPath: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      valuePath: normalized > 0
        ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${valLargeArc} 1 ${valEnd.x} ${valEnd.y}`
        : null,
    };
  }, [param, value, size, cfg]);

  const displayValue = value !== null && value !== undefined ? value.toFixed(param === 'temperature' ? 1 : 2) : '--';

  return (
    <div className="gauge-container">
      <svg
        width={size}
        height={size * 0.85}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`grad-${param}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id={`glow-${param}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={size * 0.065}
          strokeLinecap="round"
        />

        {/* Value arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={`url(#grad-${param})`}
            strokeWidth={size * 0.065}
            strokeLinecap="round"
            style={{ transition: 'd 0.6s ease' }}
          />
        )}

        {/* Center text */}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill={color}
          fontSize={size * 0.16} fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {displayValue}
        </text>
        <text x={size / 2} y={size / 2 + size * 0.12} textAnchor="middle"
          fill="var(--color-text-secondary)" fontSize={size * 0.08} fontFamily="Inter, sans-serif">
          {cfg.unit || cfg.label}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: -12, fontWeight: 600 }}>
        {cfg.label}
      </div>
    </div>
  );
};

export default RealTimeMeter;
