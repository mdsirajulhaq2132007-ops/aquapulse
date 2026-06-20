import { useEffect, useState } from 'react';
import { authService, villageService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Users, Plus, X } from 'lucide-react';
import SafetyBadge from '../components/common/SafetyBadge';
import toast from 'react-hot-toast';

const AdminPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'health_worker', language: 'en' });

  if (!isAdmin) return <Navigate to="/" replace />;

  useEffect(() => {
    Promise.all([authService.getUsers(), villageService.getAll()])
      .then(([uRes, vRes]) => { setUsers(uRes.data.data); setVillages(vRes.data.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await authService.register(newUser);
      setUsers((prev) => [...prev, res.data.data.user]);
      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'health_worker', language: 'en' });
      toast.success('User registered successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await authService.updateUser(user._id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => u._id === user._id ? res.data.data : u));
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <div className="loader-container"><div className="spinner" /></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title"><ShieldCheck size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />Admin Panel</h1>
          <p className="page-subtitle">Manage users and system configuration</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Users table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Users size={16} style={{ marginRight: 6 }} />System Users ({users.length})</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Language</th>
              <th>Assigned Villages</th><th>Status</th><th>Last Login</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#070d1a' }}>
                      {u.name?.charAt(0)}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                <td>
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                    background: u.role === 'admin' ? 'rgba(0,212,255,0.15)' : 'rgba(255,167,36,0.15)',
                    color: u.role === 'admin' ? 'var(--color-accent)' : 'var(--color-warning)' }}>
                    {u.role === 'admin' ? '⚡ Admin' : '🏥 Worker'}
                  </span>
                </td>
                <td style={{ textTransform: 'uppercase', fontSize: 12 }}>{u.language}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {u.assignedVillages?.map((v) => v.name || v).join(', ') || '—'}
                </td>
                <td>
                  <span style={{ fontSize: 12, color: u.isActive ? 'var(--color-safe)' : 'var(--color-danger)' }}>
                    {u.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td>
                  <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => handleToggleActive(u)} style={{ fontSize: 11, padding: '4px 10px' }}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 className="modal-title">Register New User</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRegister}>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@aquapulse.in' },
                { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input type={type} className="form-input" placeholder={placeholder}
                    value={newUser[key]} onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })} required />
                </div>
              ))}

              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="health_worker">Health Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <select className="form-select" value={newUser.language}
                  onChange={(e) => setNewUser({ ...newUser, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
