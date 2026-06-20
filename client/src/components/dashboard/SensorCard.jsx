import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { sensorService } from '../../services/api';
import RealTimeMeter from './RealTimeMeter';
import SafetyBadge from '../common/SafetyBadge';
import { Droplets, MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './SensorCard.css';

const SensorCard = ({ source }) => {
  const { on, off, joinSource } = useSocket();
  const [reading, setReading] = useState(source.lastReadingValues ? {
    ph: source.lastReadingValues.ph,
    turbidity: source.lastReadingValues.turbidity,
    temperature: source.lastReadingValues.temperature,
    safetyStatus: source.safetyStatus,
    timestamp: source.lastReading,
  } : null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!source._id) return;
    joinSource(source._id);

    const handler = (data) => {
      if (data.sourceId === source._id || data.sourceId?.toString() === source._id?.toString()) {
        setReading(data.reading);
        setFlash(true);
        setTimeout(() => setFlash(false), 1000);
      }
    };

    on('sensor:update', handler);
    return () => off('sensor:update', handler);
  }, [source._id]);

  const sourceTypeIcons = {
    well: '🪣', river: '🌊', tap: '🚿', pond: '🫧',
    borewell: '⛽', spring: '💧',
    water_tank: '🛢️', tap_water: '🚰', lake: '🏞️', hand_pump: '🔧',
  };

  return (
    <div className={`sensor-card card ${flash ? 'sensor-flash' : ''}`}>
      <div className="sensor-card-header">
        <div className="sensor-card-info">
          <div className="sensor-name">
            <span className="source-type-icon">{sourceTypeIcons[source.type] || '💧'}</span>
            {source.name}
          </div>
          <div className="sensor-location">
            <MapPin size={12} />
            {source.village?.name}, {source.village?.district}
          </div>
        </div>
        <SafetyBadge status={reading?.safetyStatus || source.safetyStatus || 'unknown'} />
      </div>

      {reading ? (
        <div className="gauges-row">
          <RealTimeMeter param="ph" value={reading.ph} size={110} />
          <RealTimeMeter param="turbidity" value={reading.turbidity} size={110} />
          <RealTimeMeter param="temperature" value={reading.temperature} size={110} />
        </div>
      ) : (
        <div className="no-reading">
          <Droplets size={32} style={{ opacity: 0.2 }} />
          <span>No readings yet</span>
        </div>
      )}

      <div className="sensor-card-footer">
        {reading?.timestamp && (
          <div className="last-updated">
            <Clock size={12} />
            {formatDistanceToNow(new Date(reading.timestamp), { addSuffix: true })}
          </div>
        )}
        <Link to={`/sources/${source._id}`} className="btn btn-secondary btn-sm">
          Details <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};

export default SensorCard;
