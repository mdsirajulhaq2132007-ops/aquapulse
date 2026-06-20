import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import {
  LayoutDashboard, MapPin, Bell, BarChart3, ShieldCheck,
  Settings, LogOut, Droplets, Wifi, WifiOff
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard'), end: true },
    { to: '/villages', icon: MapPin, label: t('villages') },
    { to: '/alerts', icon: Bell, label: t('alerts') },
    { to: '/analytics', icon: BarChart3, label: t('analytics') },
    ...(isAdmin ? [{ to: '/admin', icon: ShieldCheck, label: t('admin') }] : []),
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Droplets size={22} />
        </div>
        <div>
          <div className="logo-name">AquaPulse</div>
          <div className="logo-tagline">Water Intelligence</div>
        </div>
      </div>

      {/* Connection status */}
      <div className={`conn-status ${connected ? 'conn-online' : 'conn-offline'}`}>
        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span>{connected ? 'Live' : 'Offline'}</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role === 'admin' ? '⚡ Admin' : '🏥 Health Worker'}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title={t('logout')}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
