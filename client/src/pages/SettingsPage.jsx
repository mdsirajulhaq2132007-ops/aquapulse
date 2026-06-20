import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { authService } from '../services/api';
import { Settings, Globe, User, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const languages = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
];

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleLangChange = (code) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    toast.success('Language updated');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.updateUser(user._id, { name, language: selectedLang });
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title"><Settings size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('settings')}</h1>
        <p className="page-subtitle">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title"><User size={16} style={{ marginRight: 6 }} />Profile</span>
        </div>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email} disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input type="text" className="form-input" value={user?.role === 'admin' ? '⚡ Admin' : '🏥 Health Worker'} disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Language */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Globe size={16} style={{ marginRight: 6 }} />Language</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLangChange(lang.code)}
              style={{
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${selectedLang === lang.code ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: selectedLang === lang.code ? 'var(--color-accent-dim)' : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all var(--transition-fast)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{lang.flag}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: selectedLang === lang.code ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{lang.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{lang.native}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
