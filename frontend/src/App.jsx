import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import PaymentCallback from './pages/PaymentCallback.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />

          {/* Protected: Customer dashboard */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute roles={['CUSTOMER', 'VENDOR', 'ADMIN']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected: Vendor (all states handled internally) */}
          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute roles={['VENDOR', 'ADMIN']}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Vendor pending/rejected redirect to dashboard */}
          <Route path="/vendor/pending"  element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="/vendor/rejected" element={<Navigate to="/vendor/dashboard" replace />} />

          {/* Protected: Admin dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized access page */}
          <Route
            path="/unauthorized"
            element={
              <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f1117',
                color: '#fca5a5',
                fontFamily: 'system-ui, sans-serif',
                gap: '16px'
              }}>
                <div style={{ fontSize: '48px' }}>🚫</div>
                <h1 style={{ fontSize: '22px', margin: 0 }}>Access Denied</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  You don't have permission to view this page.
                </p>
                <a href="/login" style={{ color: '#4ade80', marginTop: '8px' }}>
                  ← Go to Login
                </a>
              </div>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all 404 */}
          <Route
            path="*"
            element={
              <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f1117',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'system-ui, sans-serif',
                gap: '16px'
              }}>
                <div style={{ fontSize: '64px' }}>🌵</div>
                <h1 style={{ color: '#f0fdf4', fontSize: '28px', margin: 0 }}>404 — Page Not Found</h1>
                <p style={{ margin: 0 }}>This page doesn't exist.</p>
                <a href="/" style={{ color: '#4ade80', marginTop: '8px' }}>← Go Home</a>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
