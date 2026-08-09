import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getVendorProducts, createProduct, updateProduct, deleteProduct, getPublicCategories } from '../api/productAPI.js';
import { getVendorOrders, updateOrderStatus } from '../api/orderAPI.js';
import { getPaymentLabel, isOnlinePayment } from '../utils/paymentUtils.js';
import { resolveImageUrl } from '../utils/imageUtils.js';
import '../styles/dashboard.css';

const TABS = ['Overview', 'My Products', 'My Orders'];

const statusPillClass = (s) => {
  const map = {
    PENDING: 'status-pill--pending', PROCESSING: 'status-pill--processing',
    SHIPPED: 'status-pill--shipped', DELIVERED: 'status-pill--delivered',
    CANCELLED: 'status-pill--cancelled',
  };
  return `status-pill ${map[s] || 'status-pill--pending'}`;
};

const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDateTime = (isoString) => {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
};

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// ── Status Confirmation Modal ───────────────────────────────────────
const StatusConfirmModal = ({ newStatus, onCancel, onConfirm, loading }) => {
  // Capitalize first letter, rest lower for display
  const displayStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();

  return (
    // Full-screen backdrop, centered
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={!loading ? onCancel : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(20,40,30,0.98) 100%)',
          border: '1px solid rgba(134,239,172,0.25)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>
          {newStatus === 'CANCELLED' ? '❌' :
           newStatus === 'DELIVERED' ? '🎉' :
           newStatus === 'SHIPPED'   ? '🚚' :
           newStatus === 'PROCESSING'? '⚙️' : '⏳'}
        </div>
        <h3 style={{ color: '#f0fdf4', fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>
          Confirm Status Change
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', margin: '0 0 28px', lineHeight: 1.5 }}>
          Do you want to change the state to{' '}
          <strong style={{
            color: newStatus === 'CANCELLED' ? '#fca5a5' :
                   newStatus === 'DELIVERED' ? '#86efac' :
                   newStatus === 'SHIPPED'   ? '#a78bfa' :
                   newStatus === 'PROCESSING'? '#93c5fd' : '#fde68a',
          }}>
            {displayStatus}
          </strong>?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: '#f0fdf4', fontSize: '14px',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '10px 28px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontSize: '14px',
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Updating…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const renderPaymentInfo = (order) => {
  const p = order.payment;
  const label = getPaymentLabel(order);

  // Online payment: show method + paid badge + transaction reference
  if (p && isOnlinePayment(p.payment_method)) {
    return (
      <div style={{ fontSize: 13 }}>
        <strong>{label}</strong><br/>
        <span style={{ fontSize: 11, color: p.payment_status === 'COMPLETED' ? '#86efac' : '#fde68a' }}>
          {p.payment_status === 'COMPLETED' ? '✓ Paid' : p.payment_status}
        </span>
        {p.transaction_id && (
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'monospace', background: 'rgba(167, 139, 250, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(167, 139, 250, 0.3)', display: 'inline-block' }}>
              Txn: {p.transaction_id}
            </span>
          </div>
        )}
      </div>
    );
  }

  // COD or no payment record
  const isDelivered = order.status === 'DELIVERED';
  return (
    <span style={{ fontSize: 13, color: isDelivered ? '#86efac' : 'rgba(255,255,255,0.8)', fontWeight: isDelivered ? 600 : 400 }}>
      {label}
    </span>
  );
};

// ── Product Modal ─────────────────────────────────────────────
const ProductModal = ({ initial, categories, onClose, onSaved }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price || '',
    stock: initial?.stock ?? '',
    category_id: initial?.category?.id || '',
    image_url: initial?.product_images?.[0]?.image_url || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('description', form.description);
      payload.append('price', form.price);
      payload.append('stock', form.stock);
      payload.append('category_id', form.category_id);
      if (form.image_url) payload.append('image_url', form.image_url);
      if (imageFile) payload.append('image', imageFile);

      if (isEdit) await updateProduct(initial.id, payload);
      else await createProduct(payload);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save product.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ New Product'}</h3>
        {err && <div className="error-msg">{err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Product Name *</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-field">
              <label>Price (रू) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
            </div>
            <div className="form-field">
              <label>Stock Qty</label>
              <input type="number" min="0" value={form.stock} onChange={set('stock')} />
            </div>
          </div>
          <div className="form-field">
            <label>Category *</label>
            <select value={form.category_id} onChange={set('category_id')} required>
              <option value="">— Select category —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Product Image</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ padding: '6px', fontSize: '13px' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>OR</span>
              <input placeholder="Paste Image URL…" value={form.image_url} onChange={set('image_url')} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--danger" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const VendorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const vendorStatus = user?.vendor?.verification_status || 'PENDING';

  const [tab, setTab] = useState('Overview');
  const [products, setProducts] = useState([]);
  const [vendor, setVendor]     = useState(null);
  const [orders, setOrders]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null); // null | 'add' | product obj
  const [updating, setUpdating] = useState({});
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { orderId, newStatus, previousStatus }

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getVendorProducts();
      setProducts(r.data.data.products);
      setVendor(r.data.data.vendor);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try { const r = await getVendorOrders(); setOrders(r.data.data.orders); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    getPublicCategories().then((r) => setCategories(r.data.data.categories)).catch(() => {});
    if (tab === 'Overview' || tab === 'My Products') loadProducts();
    if (tab === 'My Orders') loadOrders();
  }, [tab, loadProducts, loadOrders]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  };

  const handleStatusSelectChange = (orderId, newStatus, previousStatus) => {
    if (newStatus === previousStatus) return; // no change, no-op
    setPendingStatusChange({ orderId, newStatus, previousStatus });
  };

  const handleStatusConfirm = async () => {
    if (!pendingStatusChange) return;
    const { orderId, newStatus } = pendingStatusChange;
    setUpdating((u) => ({ ...u, [orderId]: true }));
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((os) => os.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch { /* ignore — select will restore when we close */ }
    finally {
      setUpdating((u) => ({ ...u, [orderId]: false }));
      setPendingStatusChange(null);
    }
  };

  const handleStatusCancel = () => {
    // Restore the previous status in the orders list (already correct — we never changed state)
    setPendingStatusChange(null);
  };

  const handleStatusChange = async (orderId, status) => {
    setUpdating((u) => ({ ...u, [orderId]: true }));
    try {
      await updateOrderStatus(orderId, status);
      setOrders((os) => os.map((o) => o.id === orderId ? { ...o, status } : o));
    } catch { /* ignore */ }
    finally { setUpdating((u) => ({ ...u, [orderId]: false })); }
  };

  // Revenue = sum of order item prices for vendor's items
  const revenue = orders.reduce((sum, o) =>
    sum + o.order_items.reduce((s, i) => s + Number(i.price) * i.quantity, 0), 0);

  // Admin without a vendor profile
  if (user?.role === 'ADMIN' && !user?.vendor) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-logo">
            <span className="logo-icon">🌿</span>
            <span className="logo-text">PlantMarket</span>
          </div>
          <div className="header-right">
            <span className="badge badge--admin">⚙ ADMIN</span>
            <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="welcome-card">
            <div className="welcome-avatar welcome-avatar--admin" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="welcome-info">
              <h2 className="welcome-name">Welcome, {user?.name}!</h2>
              <p className="welcome-email">{user?.email}</p>
              <span className="badge badge--admin">⚙ ADMIN</span>
            </div>
          </div>
          <div className="info-banner info-banner--purple">
            <span>ℹ️</span>
            <p>You are logged in as an <strong>Admin</strong>. You do not have a store profile. To view the vendor experience, please <strong>Sign Out</strong> and log in with the Vendor demo credentials.</p>
          </div>
        </main>
      </div>
    );
  }

  // PENDING state
  if (vendorStatus === 'PENDING') {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-logo"><span className="logo-icon">🌿</span><span className="logo-text">PlantMarket</span></div>
          <div className="header-right">
            <span className="badge badge--vendor">🏪 VENDOR</span>
            <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="welcome-card">
            <div className="welcome-avatar welcome-avatar--vendor">{user?.name?.charAt(0)?.toUpperCase() || 'V'}</div>
            <div className="welcome-info">
              <h2 className="welcome-name">Welcome, {user?.name}!</h2>
              <p className="welcome-email">{user?.email}</p>
              <span className="badge badge--vendor">🏪 VENDOR</span>
            </div>
          </div>
          <div className="info-banner info-banner--yellow">
            <span>⏳</span>
            <p>Your vendor account is <strong>pending admin approval</strong>. Once approved you can start listing products and receiving orders.</p>
          </div>
        </main>
      </div>
    );
  }

  // REJECTED vendor
  if (vendorStatus === 'REJECTED') {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-logo"><span className="logo-icon">🌿</span><span className="logo-text">PlantMarket</span></div>
          <div className="header-right">
            <span className="badge badge--vendor">🏪 VENDOR</span>
            <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="welcome-card">
            <div className="welcome-avatar welcome-avatar--vendor">{user?.name?.charAt(0)?.toUpperCase() || 'V'}</div>
            <div className="welcome-info">
              <h2 className="welcome-name">Welcome, {user?.name}!</h2>
              <p className="welcome-email">{user?.email}</p>
              <span className="badge badge--vendor">🏪 VENDOR</span>
            </div>
          </div>
          <div className="info-banner info-banner--red">
            <span>❌</span>
            <p>Your vendor application was <strong>rejected</strong>. Please contact support for details or re-apply with updated information.</p>
          </div>
        </main>
      </div>
    );
  }

  // APPROVED vendor
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo"><span className="logo-icon">🌿</span><span className="logo-text">PlantMarket</span></div>
        <div className="header-right">
          <span className="badge badge--vendor">🏪 VENDOR</span>
          <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <div className="welcome-avatar welcome-avatar--vendor">{user?.name?.charAt(0)?.toUpperCase() || 'V'}</div>
          <div className="welcome-info">
            <h2 className="welcome-name">{vendor?.store_name || user?.name + "'s Store"}</h2>
            <p className="welcome-email">{user?.email}</p>
            <span className="badge badge--vendor">🏪 VENDOR</span>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'Overview' && '📊 '}
              {t === 'My Products' && '🌱 '}
              {t === 'My Orders' && '📦 '}
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>}

        {/* ── Overview ── */}
        {!loading && tab === 'Overview' && (
          <div className="stat-grid">
            <div className="stat-card stat-card--green">
              <div className="stat-icon">🌱</div>
              <div className="stat-value">{products.length}</div>
              <div className="stat-label">Products Listed</div>
            </div>
            <div className="stat-card stat-card--purple">
              <div className="stat-icon">📦</div>
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card stat-card--warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-value">{orders.filter((o) => o.status === 'PENDING').length}</div>
              <div className="stat-label">Pending Orders</div>
            </div>
            <div className="stat-card stat-card--green">
              <div className="stat-icon">💰</div>
              <div className="stat-value">रू{fmt(revenue)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
        )}

        {/* ── My Products ── */}
        {!loading && tab === 'My Products' && (
          <>
            <div className="section-header">
              <h3 className="section-title">My Products ({products.length})</h3>
              <button className="btn btn--primary" onClick={() => setModal('add')}>➕ Add Product</button>
            </div>
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <p className="empty-text">You have no products yet. Add your first listing!</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.product_images?.[0] && (
                            <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', marginTop: 4, background: 'rgba(255,255,255,0.06)' }}>
                              <img src={resolveImageUrl(p.product_images[0].image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                            </div>
                          )}
                        </td>
                        <td>{p.category?.name || '—'}</td>
                        <td style={{ color: '#86efac' }}>रू{fmt(p.price)}</td>
                        <td>
                          <span style={{ color: p.stock === 0 ? '#fca5a5' : p.stock < 5 ? '#fde68a' : 'inherit' }}>
                            {p.stock} {p.stock === 0 ? '(Out)' : ''}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn--edit" onClick={() => setModal(p)}>Edit</button>
                            <button className="btn btn--danger" onClick={() => handleDelete(p.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── My Orders ── */}
        {!loading && tab === 'My Orders' && (
          <>
            <div className="section-header">
              <h3 className="section-title">My Orders ({orders.length})</h3>
            </div>
            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p className="empty-text">No orders received yet.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Date Placed</th><th>Status</th><th>Update</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{o.id.slice(0, 8)}…</td>
                        <td><strong>{o.user?.name}</strong></td>
                        <td>{o.order_items.map((i) => `${i.product?.name ?? '[Deleted Product]'} ×${i.quantity}`).join(', ')}</td>
                        <td style={{ color: '#86efac' }}>रू{fmt(o.order_items.reduce((s, i) => s + Number(i.price) * i.quantity, 0))}</td>
                        <td>{renderPaymentInfo(o)}</td>
                        <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{fmtDateTime(o.created_at)}</td>
                        <td><span className={statusPillClass(o.status)}>{o.status}</span></td>
                        <td>
                          <select
                            value={o.status}
                            disabled={updating[o.id]}
                            onChange={(e) => handleStatusSelectChange(o.id, e.target.value, o.status)}
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0fdf4', padding: '5px 8px', fontSize: 12, fontFamily: 'inherit' }}
                          >
                            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {modal && (
        <ProductModal
          initial={modal === 'add' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={loadProducts}
        />
      )}

      {pendingStatusChange && (
        <StatusConfirmModal
          newStatus={pendingStatusChange.newStatus}
          loading={!!updating[pendingStatusChange.orderId]}
          onCancel={handleStatusCancel}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default VendorDashboard;
