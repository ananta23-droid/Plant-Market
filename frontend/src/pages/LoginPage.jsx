import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(formData.email, formData.password);

      // Route by role first, then vendor status
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'VENDOR') {
        const status = user.vendor?.verification_status;
        if (status === 'APPROVED') navigate('/vendor/dashboard', { replace: true });
        else if (status === 'REJECTED') navigate('/vendor/rejected', { replace: true });
        else navigate('/vendor/pending', { replace: true }); // PENDING or unknown
      } else {
        // CUSTOMER — go to where they were trying to go, or customer dashboard
        navigate(from === '/dashboard' ? '/customer/dashboard' : from, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative background blobs */}
      <div className="auth-bg">
        <div className="blob blob-1" aria-hidden="true" />
        <div className="blob blob-2" aria-hidden="true" />
        <div className="blob blob-3" aria-hidden="true" />
      </div>

      <div className="auth-card" role="main">
        {/* Brand header */}
        <div className="auth-brand">
          <div className="brand-icon" aria-hidden="true">🌿</div>
          <h1 className="brand-name">PlantMarket</h1>
          <p className="brand-tagline">Your green marketplace</p>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue to your account</p>
        </div>

        {error && (
          <div className="auth-error" role="alert" aria-live="assertive">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email address</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="login-email"
                type="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className={`auth-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" aria-hidden="true" /> Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        {/* Quick-fill demo credentials */}
        <div className="demo-credentials">
          <p className="demo-label">Demo credentials</p>
          <div className="demo-pills">
            <button
              type="button"
              className="demo-pill"
              onClick={() => setFormData({ email: 'admin@plantmarket.com', password: 'Admin@123' })}
            >
              👤 Admin
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => setFormData({ email: 'evergreen@nursery.com', password: 'Vendor@123' })}
            >
              🏪 Vendor
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => setFormData({ email: 'john@customer.com', password: 'Customer@123' })}
            >
              🛒 Customer
            </button>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
