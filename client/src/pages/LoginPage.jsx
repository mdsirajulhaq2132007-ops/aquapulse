import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Droplets, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@aquapulse.in', password: 'Admin@1234' });
    else setForm({ email: 'priya@aquapulse.in', password: 'Worker@1234' });
  };

  return (
    <div className="login-page">
      {/* Animated background particles */}
      <div className="login-bg">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{ '--delay': `${i * 0.4}s`, '--x': `${Math.random() * 100}%` }} />
        ))}
      </div>

      <div className="login-container">
        {/* Left panel */}
        <div className="login-hero">
          <div className="login-hero-content">
            <div className="hero-logo">
              <Droplets size={48} />
            </div>
            <h1 className="hero-title">AquaPulse</h1>
            <p className="hero-subtitle">Community Water Health<br />Intelligence Platform</p>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">3</div>
                <div className="hero-stat-label">Villages</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">6</div>
                <div className="hero-stat-label">Water Sources</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">24/7</div>
                <div className="hero-stat-label">Monitoring</div>
              </div>
            </div>

            <div className="hero-features">
              <div className="hero-feature">⚡ Real-time IoT sensor data</div>
              <div className="hero-feature">🔬 WHO-standard water safety analysis</div>
              <div className="hero-feature">🌐 Multilingual support (EN/HI/TE)</div>
              <div className="hero-feature">📊 Historical analytics & trends</div>
            </div>
          </div>
        </div>

        {/* Right panel - Login form */}
        <div className="login-form-panel">
          <div className="login-form-card">
            <div className="login-header">
              <Shield size={28} color="var(--color-accent)" />
              <div>
                <h2>{t('loginTo')}</h2>
                <p>{t('loginSubtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@aquapulse.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('password')}</label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button id="login-btn" type="submit" className="btn btn-primary login-submit" disabled={loading}>
                {loading ? 'Signing in...' : t('login')}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="demo-creds">
              <div className="demo-label">Demo Accounts</div>
              <div className="demo-buttons">
                <button className="demo-btn" onClick={() => fillDemo('admin')}>
                  ⚡ Admin
                </button>
                <button className="demo-btn" onClick={() => fillDemo('worker')}>
                  🏥 Health Worker
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
