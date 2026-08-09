import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'CUSTOMER',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password strength calculator
  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { level: score, label: 'Weak', color: '#ef4444' };
    if (score === 3) return { level: score, label: 'Fair', color: '#f59e0b' };
    if (score === 4) return { level: score, label: 'Good', color: '#10b981' };
    return { level: score, label: 'Strong', color: '#059669' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: formData.role,
      });

      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'VENDOR') {
        const status = user.vendor?.verification_status;
        if (status === 'APPROVED') navigate('/vendor/dashboard', { replace: true });
        else if (status === 'REJECTED') navigate('/vendor/rejected', { replace: true });
        else navigate('/vendor/pending', { replace: true }); // New vendors are always PENDING
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="blob blob-1" aria-hidden="true" />
        <div className="blob blob-2" aria-hidden="true" />
        <div className="blob blob-3" aria-hidden="true" />
      </div>

      <div className="auth-card auth-card--register" role="main">
        <div className="auth-brand">
          <div className="brand-icon" aria-hidden="true">🌿</div>
          <h1 className="brand-name">PlantMarket</h1>
          <p className="brand-tagline">Your green marketplace</p>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Create an account</h2>
          <p className="auth-subtitle">Join thousands of plant lovers today</p>
        </div>

        {error && (
          <div className="auth-error" role="alert" aria-live="assertive">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form id="register-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Account type selector */}
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div className="role-selector" role="radiogroup" aria-label="Account type">
              <label className={`role-option ${formData.role === 'CUSTOMER' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="CUSTOMER"
                  checked={formData.role === 'CUSTOMER'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="role-icon">🛒</span>
                <span className="role-text">Customer</span>
                <span className="role-desc">Shop for plants</span>
              </label>
              <label className={`role-option ${formData.role === 'VENDOR' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="VENDOR"
                  checked={formData.role === 'VENDOR'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="role-icon">🏪</span>
                <span className="role-text">Vendor</span>
                <span className="role-desc">Sell your plants</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full name</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">👤</span>
              <input
                id="reg-name"
                type="text"
                name="name"
                className="form-input"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="reg-email"
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
            <label htmlFor="reg-phone" className="form-label">Phone</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">📱</span>
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                className="form-input"
                placeholder="+977 98XXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
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
            {/* Password strength meter */}
            {formData.password && (
              <div className="password-strength" aria-label={`Password strength: ${strength.label}`}>
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{ backgroundColor: i <= strength.level ? strength.color : undefined }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password" className="form-label">Confirm password</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                className={`form-input ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'input-error'
                    : ''
                }`}
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <span className="input-check" aria-label="Passwords match">✓</span>
              )}
            </div>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className={`auth-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" aria-hidden="true" /> Creating account...</>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
