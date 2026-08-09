import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'ADMIN') return 'badge badge--admin';
    if (role === 'VENDOR') return 'badge badge--vendor';
    return 'badge badge--customer';
  };

  const getRoleIcon = (role) => {
    if (role === 'ADMIN') return '⚙';
    if (role === 'VENDOR') return '🏪';
    return '🛒';
  };

  return (
    <div className="dashboard-page">
      {/* Decorative top bar */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-icon">🌿</span>
          <span className="logo-text">PlantMarket</span>
        </div>
        <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <div className="welcome-avatar" aria-hidden="true">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="welcome-info">
            <h2 className="welcome-name">Welcome, {user?.name}!</h2>
            <p className="welcome-email">{user?.email}</p>
            <span className={getRoleBadgeClass(user?.role)}>
              {getRoleIcon(user?.role)} {user?.role}
            </span>
          </div>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">✅</div>
            <h3>Authentication</h3>
            <p>JWT issued & verified</p>
          </div>
          <div className="status-card">
            <div className="status-icon">🔐</div>
            <h3>Authorization</h3>
            <p>RBAC middleware active</p>
          </div>
          <div className="status-card">
            <div className="status-icon">🗄</div>
            <h3>Database</h3>
            <p>Prisma + PostgreSQL ready</p>
          </div>
          <div className="status-card">
            <div className="status-icon">🚀</div>
            <h3>Next Step</h3>
            <p>Product catalog & listings</p>
          </div>
        </div>

        {user?.role === 'VENDOR' && (
          <div className="info-banner info-banner--yellow">
            <span>🏪</span>
            <p>Your vendor account is pending admin approval before you can list products.</p>
          </div>
        )}

        {user?.role === 'ADMIN' && (
          <div className="info-banner info-banner--purple">
            <span>⚙</span>
            <p>Admin dashboard — Full platform management coming in the next milestone.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
