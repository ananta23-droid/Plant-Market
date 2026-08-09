import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance.js';
import '../styles/auth.css'; // Reuse auth styles for centering card

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('VERIFYING'); // VERIFYING, SUCCESS, FAILED
  const [message, setMessage] = useState('Verifying your payment, please wait...');

  useEffect(() => {
    const verifyPayment = async () => {
      const pidx = searchParams.get('pidx');
      const transaction_id = searchParams.get('transaction_id');
      const purchase_order_id = searchParams.get('purchase_order_id');

      if (!pidx) {
        setStatus('FAILED');
        setMessage('Invalid payment callback. Missing payment index.');
        return;
      }

      try {
        await api.post('/payment/khalti/verify', { pidx, transaction_id, purchase_order_id });
        setStatus('SUCCESS');
        setMessage('Your payment was successful! Your order is now processing.');
      } catch (error) {
        setStatus('FAILED');
        setMessage(error.response?.data?.message || 'Payment verification failed.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="blob blob-1" aria-hidden="true" />
        <div className="blob blob-2" aria-hidden="true" />
        <div className="blob blob-3" aria-hidden="true" />
      </div>

      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="auth-brand" style={{ marginBottom: 24 }}>
          {status === 'VERIFYING' && <div className="brand-icon" style={{ animation: 'spin 2s linear infinite' }}>⏳</div>}
          {status === 'SUCCESS' && <div className="brand-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>✅</div>}
          {status === 'FAILED' && <div className="brand-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>❌</div>}
        </div>
        
        <h2 className="auth-title" style={{ marginBottom: 12 }}>
          {status === 'VERIFYING' && 'Verifying Payment'}
          {status === 'SUCCESS' && 'Payment Successful'}
          {status === 'FAILED' && 'Payment Failed'}
        </h2>
        
        <p className="auth-subtitle" style={{ marginBottom: 32 }}>
          {message}
        </p>

        {status !== 'VERIFYING' && (
          <Link to="/customer/dashboard" className="auth-btn" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '12px 32px' }}>
            Return to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
