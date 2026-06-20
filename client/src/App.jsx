import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import './i18n';

import Sidebar from './components/common/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VillagesPage from './pages/VillagesPage';
import VillageDetailPage from './pages/VillageDetailPage';
import SourceDetailPage from './pages/SourceDetailPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loader-container" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><DashboardPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/villages" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><VillagesPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/villages/:id" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><VillageDetailPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/sources/:id" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><SourceDetailPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/alerts" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><AlertsPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><AnalyticsPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><AdminPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SocketProvider>
            <AppLayout><SettingsPage /></AppLayout>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
