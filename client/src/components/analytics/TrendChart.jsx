import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const PARAM_CONFIG = {
  ph: { color: '#10b981', label: 'pH', safeMin: 6.5, safeMax: 8.5, domain: [5, 10] },
  turbidity: { color: '#2563eb', label: 'Turbidity (NTU)', safeMin: 0, safeMax: 1, warnMax: 4, domain: [0, 8] },
  temperature: { color: '#f59e0b', label: 'Temperature (°C)', safeMin: 10, safeMax: 25, domain: [0, 35] },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

const TrendChart = ({ data = [], param = 'ph' }) => {
  const cfg = PARAM_CONFIG[param];

  const formatted = data.map((d) => ({
    ...d,
    label: d.timestamp ? format(new Date(d.timestamp), 'MMM d HH:mm') : '',
    value: typeof d[`avg${param.charAt(0).toUpperCase() + param.slice(1)}`] === 'number'
      ? +d[`avg${param.charAt(0).toUpperCase() + param.slice(1)}`].toFixed(2)
      : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={cfg.domain} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
        <Tooltip content={<CustomTooltip />} />

        {/* Safe range reference lines */}
        {cfg.safeMin !== undefined && (
          <ReferenceLine y={cfg.safeMin} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" label={{ value: 'Min Safe', fill: '#10b981', fontSize: 9 }} />
        )}
        {cfg.safeMax !== undefined && (
          <ReferenceLine y={cfg.safeMax} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" label={{ value: 'Max Safe', fill: '#10b981', fontSize: 9 }} />
        )}
        {cfg.warnMax !== undefined && (
          <ReferenceLine y={cfg.warnMax} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: 'Danger', fill: '#ef4444', fontSize: 9 }} />
        )}

        <Line
          type="monotone"
          dataKey="value"
          name={cfg.label}
          stroke={cfg.color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: cfg.color, stroke: '#ffffff', strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
