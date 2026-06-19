import React, { useState, useEffect } from 'react';
import {
  loginAdmin, fetchOrders, updateOrderStatus, deleteOrder,
  fetchContactQueries, markQueryRead, deleteQuery,
  addProduct, updateProduct, deleteProduct, fetchProducts, fetchProductById,
  fetchSettings, updateSettings, fetchCategories, addCategory, deleteCategory
} from '../data/apiService';
import {
  Edit2, Trash2, Plus, ShieldAlert, QrCode, Upload, Monitor,
  Package, MessageSquare, CheckCircle, Truck, Clock, XCircle, ShieldCheck,
  LayoutDashboard, ChevronDown, ChevronUp, Eye, Mail, Search,
  ShoppingCart, Settings, LogOut, DollarSign, AlertCircle, List, Loader
} from 'lucide-react';
import './Admin.css';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const statusColor = (status) => {
  if (!status || status === 'pending') return '#f59e0b';
  if (status === 'confirmed') return '#3b82f6';
  if (status === 'packed') return '#8b5cf6';
  if (status === 'shipped') return '#06b6d4';
  if (status === 'delivered') return '#10b981';
  if (status === 'cancelled') return '#ef4444';
  return '#6b7280';
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('lookwalk_admin_token'));
  const [banner, setBanner] = useState({ image: '', text: '', active: false }); // Banner temporarily retained for admin UI stability
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Products & Categories
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  // Orders & Queries
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [queries, setQueries] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);

  // Central DB-backed Settings
  const [qrUrl, setQrUrl] = useState('');
  const [heroBg, setHeroBg] = useState('');
  const [ethosImg, setEthosImg] = useState('');
  const [about1, setAbout1] = useState('');
  const [about2, setAbout2] = useState('');
  // Banner state removed
  const [stdShipping, setStdShipping] = useState(300);
  const [uploadingKey, setUploadingKey] = useState('');

  const initialForm = {
    name: '', price: '', category: '', image: '', images: [], description: '',
    in_stock: true, sizes: 'S, M, L, XL', variants: [], featured: false
  };
  const [formData, setFormData] = useState(initialForm);
  const [dbStatus, setDbStatus] = useState('checking');
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // ── LOAD PRODUCTS & CATEGORIES ─────────────────────────────────────────────
  const loadProducts = async () => {
    setProductLoading(true);
    try {
      const fetched = await fetchProducts(200);
      setProducts(fetched);
    } catch (err) {
      console.error('Products load failed:', err);
    }
    setProductLoading(false);
  };

  const loadCategories = async () => {
    try {
      const fetched = await fetchCategories();
      setCategories(fetched);
    } catch (err) {
      console.error('Categories load failed:', err);
    }
  };

  // ── LOAD ORDERS & QUERIES ──────────────────────────────────────────────────
  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const fetched = await fetchOrders(200);
      setOrders(fetched);
    } catch (err) {
      console.warn('Orders fetch failed:', err.message);
    }
    setOrdersLoading(false);
  };

  const loadQueries = async () => {
    setQueriesLoading(true);
    try {
      const fetched = await fetchContactQueries();
      setQueries(fetched);
    } catch (err) {
      console.warn('Queries fetch failed:', err.message);
    }
    setQueriesLoading(false);
  };

  const saveBanner = async () => {
    // No-op: banner functionality removed
    alert('Banner feature is disabled.');
  };

  // ── LOAD SETTINGS FROM DB ──────────────────────────────────────────────────
  const loadDBSettings = async () => {
    try {
      const s = await fetchSettings('std_shipping_rate');
      if (s) setStdShipping(Number(s));
      const qr = await fetchSettings('payment_qr');
      if (qr) setQrUrl(qr);
      const h = await fetchSettings('lookwalk_hero_bg');
      if (h) setHeroBg(h);
      const e = await fetchSettings('lookwalk_ethos_img');
      if (e) setEthosImg(e);
      const a1 = await fetchSettings('lookwalk_about_img_1');
      if (a1) setAbout1(a1);
      const a2 = await fetchSettings('lookwalk_about_img_2');
      if (a2) setAbout2(a2);

    } catch (err) {
      console.error('Error loading centralized settings:', err);
    }
  };



  useEffect(() => {
    if (!isAuthenticated) return;
    loadProducts();
    loadCategories();
    loadOrders();
    loadQueries();
    loadDBSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api'}/health`);
        const data = await res.json();
        setDbStatus(data.status === 'ok' ? 'connected' : 'disconnected');
      } catch {
        setDbStatus('disconnected');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time polling for new orders
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = async () => {
      try {
        const fetched = await fetchOrders(100);
        if (fetched.length > lastOrderCount && lastOrderCount !== 0) {
          setNewOrderAlert(true);
        }
        setOrders(fetched);
        setLastOrderCount(fetched.length);
      } catch (error) {
        console.warn('Polling failed:', error);
      }
    };
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [isAuthenticated, lastOrderCount]);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await loginAdmin(loginForm.userId, loginForm.password);
      if (response.success && response.token) {
        sessionStorage.setItem('lookwalk_admin_token', response.token);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid User ID or Password.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lookwalk_admin_token');
    setIsAuthenticated(false);
  };

  // ── PRODUCTS & MULTIPLE IMAGES ─────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'price' ? Number(value) : value)
    }));
  };

  const compressFile = (file, callback) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 800, maxH = 800;
      let { width, height } = img;
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(url);
      callback(compressed);
    };
    img.src = url;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) compressFile(file, (img) => setFormData(f => ({ ...f, image: img })));
  };

  // Add extra image to array
  const handleExtraImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressFile(file, (img) => {
        setFormData(f => ({ ...f, images: [...(f.images || []), img] }));
      });
    }
  };

  const removeExtraImage = (index) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  // ── VARIANTS ───────────────────────────────────────────────────────────────
  const addVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { color: '', image: '', stock: 0 }] });
  };

  const removeVariant = (index) => {
    const newVariants = [...formData.variants];
    newVariants.splice(index, 1);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const handleVariantStockChange = (vIdx, size, qty) => {
    const newVariants = [...formData.variants];
    if (typeof newVariants[vIdx].stock !== 'object' || newVariants[vIdx].stock === null) {
      newVariants[vIdx].stock = {};
    }
    newVariants[vIdx].stock[size] = parseInt(qty) || 0;
    setFormData({ ...formData, variants: newVariants });
  };

  const handleVariantImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) compressFile(file, (img) => handleVariantChange(index, 'image', img));
  };

  // ── CATEGORIES ─────────────────────────────────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addCategory(newCategoryName);
      alert('Category added successfully!');
      setNewCategoryName('');
      loadCategories();
    } catch {
      alert('Failed to add category.');
    }
  };

  const handleDeleteCategory = async (name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await deleteCategory(name);
      loadCategories();
    } catch {
      alert('Failed to delete category.');
    }
  };

  // ── SUBMIT PRODUCT ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      sizes: typeof formData.sizes === 'string'
        ? (formData.sizes ? formData.sizes.split(',').map(s => s.trim()) : [])
        : (formData.sizes || [])
    };
    try {
      if (isEditing) {
        await updateProduct(currentId, finalData);
        alert('Product updated successfully!');
      } else {
        await addProduct(finalData);
        alert('Product added successfully!');
      }
      loadProducts();
      setIsEditing(false);
      setCurrentId(null);
      setFormData(initialForm);
    } catch (error) {
      alert(error.message || 'Failed to save product.');
    }
  };

  const handleEdit = async (product) => {
    setIsEditing(true);
    setCurrentId(product.id);
    try {
      const fullProduct = await fetchProductById(product.id);
      setFormData({
        name: fullProduct.name,
        price: fullProduct.price,
        category: fullProduct.category,
        image: fullProduct.image,
        images: fullProduct.images || [],
        description: fullProduct.description || '',
        in_stock: fullProduct.in_stock === undefined ? true : !!fullProduct.in_stock,
        sizes: fullProduct.sizes ? fullProduct.sizes.join(', ') : '',
        variants: (fullProduct.variants || []).map(v => ({
          ...v,
          stock: typeof v.stock === 'object' ? v.stock : { 'Default': v.stock || 0 }
        })),
        // discount_percent removed
        featured: !!fullProduct.featured
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Failed to load product details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (error) {
      alert('Failed to delete product.');
    }
  };

  const cancelEdit = () => { setIsEditing(false); setCurrentId(null); setFormData(initialForm); };

  // ── SAVE SETTINGS (CENTRAL DB) ─────────────────────────────────────────────
  

  const saveShippingRate = async () => {
    try {
      await updateSettings('std_shipping_rate', stdShipping);
      alert('Shipping rate updated in Database!');
    } catch { alert('Failed to save shipping rate.'); }
  };



  const handleAppearanceUpload = async (e, key, setter) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingKey(key);
      compressFile(file, async (img) => {
        try {
          await updateSettings(key, img);
          setter(img);
          alert('Image updated in Database!');
        } catch {
          alert('Failed to upload image.');
        } finally {
          setUploadingKey('');
        }
      });
    }
  };

  const removeAppearanceSetting = async (key, setter) => {
    try {
      await updateSettings(key, '');
      setter('');
      alert('Image cleared from Database.');
    } catch { alert('Failed to clear image.'); }
  };

  // ── ORDER LIFECYCLE ────────────────────────────────────────────────────────
  const handleOrderUpdate = async (orderId, field, value) => {
    try {
      await updateOrderStatus(orderId, field, value);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));
    } catch (error) {
      alert(error.message || 'Failed to update order.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { alert('Failed to delete order.'); }
  };

  // ── QUERY HELPERS ──────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markQueryRead(id);
      setQueries(prev => prev.map(q => q.id === id ? { ...q, status: 'read' } : q));
    } catch { alert('Failed to update.'); }
  };

  const handleDeleteQuery = async (id) => {
    if (!window.confirm('Delete this query?')) return;
    try {
      await deleteQuery(id);
      setQueries(prev => prev.filter(q => q.id !== id));
    } catch { alert('Failed to delete.'); }
  };

  // ── ANALYTICS CALCULATIONS ─────────────────────────────────────────────────
  const totalRevenue = orders
    .filter(o => o.payment_status === 'received')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const activeShipments = orders.filter(o => o.payment_status === 'received' && ['confirmed', 'packed', 'shipped'].includes(o.delivery_status)).length;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const unreadCount = queries.filter(q => q.status === 'unread').length;

  const lowStockAlerts = [];
  products.forEach(p => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    variants.forEach(v => {
      if (typeof v.stock === 'object' && v.stock !== null) {
        Object.entries(v.stock).forEach(([size, qty]) => {
          if (qty <= 3) {
            lowStockAlerts.push({ id: p.id, name: p.name, color: v.color, size, qty });
          }
        });
      } else {
        const qty = Number(v.stock) || 0;
        if (qty <= 3) {
          lowStockAlerts.push({ id: p.id, name: p.name, color: v.color, size: 'Standard', qty });
        }
      }
    });
  });

  const ordersByStatus = {
    pending: orders.filter(o => o.delivery_status === 'pending').length,
    confirmed: orders.filter(o => o.delivery_status === 'confirmed').length,
    packed: orders.filter(o => o.delivery_status === 'packed').length,
    shipped: orders.filter(o => o.delivery_status === 'shipped').length,
    delivered: orders.filter(o => o.delivery_status === 'delivered').length,
    cancelled: orders.filter(o => o.delivery_status === 'cancelled').length,
  };

  // Unique customer email addresses
  const uniqueCustomerCount = new Set(orders.map(o => o.customer?.email).filter(Boolean)).size;

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="page-wrapper container animate-fade-in-up" style={{ minHeight: '65vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', margin: '0 0 2rem' }}>
            <ShieldAlert size={40} className="text-accent" style={{ marginBottom: '1rem' }} />
            <h2 className="title-glow text-accent" style={{ margin: 0 }}>ADMIN LOGIN</h2>
          </div>
          {loginError && <p style={{ color: '#ef4444', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}>{loginError}</p>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>USER ID</label>
              <input type="text" className="futuristic-input" value={loginForm.userId} onChange={e => setLoginForm({ ...loginForm, userId: e.target.value })} required />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>PASSWORD</label>
              <input type="password" className="futuristic-input" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN ADMIN ────────────────────────────────────────────────────────────
  return (
    <div className="admin-page-container">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar-nav">
        <div className="admin-logo">
          <ShieldAlert size={28} className="text-accent" />
          <h2 className="title-glow">LOOKWALK</h2>
          <span className="admin-badge">ADMIN</span>
        </div>

        <nav className="admin-nav-links">
          <button className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <Package size={20} /> <span>Inventory</span>
          </button>
          <button className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <List size={20} /> <span>Categories</span>
          </button>
          <button className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <Truck size={20} /> <span>Orders</span>
            {activeShipments > 0 && <span className="nav-count warn">{activeShipments}</span>}
          </button>
          <button className={`admin-nav-item ${activeTab === 'queries' ? 'active' : ''}`} onClick={() => setActiveTab('queries')}>
            <MessageSquare size={20} /> <span>Queries</span>
            {unreadCount > 0 && <span className="nav-count glow">{unreadCount}</span>}
          </button>
          <button className={`admin-nav-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
            <Monitor size={20} /> <span>Appearance</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-nav-item logout">
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        <header className="admin-top-bar glass-panel">
          <div className="top-bar-left">
            <h1 className="title-glow text-accent">{activeTab.toUpperCase()}</h1>
            <p className="breadcrumb">Admin / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</p>
          </div>
          <div className="top-bar-right">
            <div className="admin-status-indicator">
              <span className={`status-dot ${dbStatus}`}></span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {dbStatus === 'checking' ? 'Checking DB...' : dbStatus === 'connected' ? 'Database Connected' : 'DB Disconnected'}
              </span>
            </div>
            <div className="admin-user-info">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: DASHBOARD (ANALYTICS)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="admin-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: '#10b98122' }}><DollarSign size={22} style={{ color: '#10b981' }} /></div>
                <div><p className="stat-num">₹{totalRevenue.toLocaleString('en-IN')}</p><p className="stat-label">Total Revenue</p></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon"><Package size={22} className="text-accent" /></div>
                <div><p className="stat-num">{orders.length}</p><p className="stat-label">Total Orders</p></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: '#3b82f622' }}><Truck size={22} style={{ color: '#3b82f6' }} /></div>
                <div><p className="stat-num" style={{ color: '#3b82f6' }}>{activeShipments}</p><p className="stat-label">Pending Deliveries</p></div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-icon" style={{ background: '#8b5cf622' }}><DollarSign size={22} style={{ color: '#8b5cf6' }} /></div>
                <div><p className="stat-num">₹{Math.round(avgOrderValue).toLocaleString('en-IN')}</p><p className="stat-label">Avg. Order Value</p></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {/* Order Status Breakdown */}
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Truck size={20} className="text-accent" /> Order Analytics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.entries(ordersByStatus).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{status}</span>
                        <span>{count} orders ({orders.length > 0 ? Math.round(count / orders.length * 100) : 0}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${orders.length > 0 ? (count / orders.length * 100) : 0}%`, height: '100%', background: statusColor(status) }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory Low Stock Alerts */}
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <AlertCircle size={20} /> Inventory Alerts
                </h3>
                {lowStockAlerts.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>✓ All products are sufficiently stocked.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {lowStockAlerts.map((alert, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                        <div>
                          <strong>{alert.name}</strong>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Variant: {alert.color} | Size: {alert.size}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{alert.qty} left</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: INVENTORY (PRODUCTS)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="admin-layout" style={{ gridTemplateColumns: 'minmax(350px,1fr) 2fr' }}>
            <div className="admin-sidebar">
              <div className="admin-form-container glass-panel">
                <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
                <form onSubmit={handleSubmit} className="admin-form">
                  <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="futuristic-input" />
                  </div>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} required className="futuristic-input" />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} required className="futuristic-input">
                      <option value="">-- Choose Category --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  {/* Main Product Image */}
                  <div className="form-group">
                    <label>Product Main Image</label>
                    {formData.image && <div style={{ marginBottom: '1rem', background: '#fff', padding: '10px', borderRadius: '8px', display: 'inline-block' }}><img src={formData.image} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'contain' }} /></div>}
                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                      <button type="button" className="btn-secondary flex-center gap-2" style={{ width: '100%' }}><Upload size={18} />{formData.image ? 'Change Main Photo...' : 'Browse Main Photo...'}</button>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} required={!formData.image} />
                    </div>
                  </div>

                  {/* Multiple Product Images */}
                  <div className="form-group" style={{ border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                    <label>Additional Images (Multiple Images Support)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {(formData.images || []).map((img, i) => (
                        <div key={i} style={{ position: 'relative', width: '60px', height: '60px' }}>
                          <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} alt="Thumb" />
                          <button type="button" onClick={() => removeExtraImage(i)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', border: 'none', borderRadius: '50%', color: '#fff', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                      <button type="button" className="btn-secondary-small flex-center gap-2" style={{ width: '100%' }}><Plus size={14} /> Add Extra Image</button>
                      <input type="file" accept="image/*" onChange={handleExtraImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} required className="futuristic-input"></textarea>
                  </div>
                  <div className="form-group">
                    <label>Available Sizes (comma separated)</label>
                    <input type="text" name="sizes" value={formData.sizes} onChange={handleInputChange} placeholder="e.g. S, M, L, XL" className="futuristic-input" />
                  </div>

                  <div className="form-group variants-manager">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <label style={{ marginBottom: 0 }}>Color Variants</label>
                      <button type="button" onClick={addVariant} className="btn-secondary-small flex-center gap-1" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        <Plus size={14} /> Add Color
                      </button>
                    </div>
                    
                    <div className="variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {formData.variants.map((v, idx) => (
                        <div key={idx} className="variant-item-card glass-panel" style={{ padding: '1rem', border: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div className="variant-img-upload" style={{ position: 'relative' }}>
                              {v.image ? (
                                <img src={v.image} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} alt="Variant" />
                              ) : (
                                <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus size={20} style={{ opacity: 0.3 }} />
                                </div>
                              )}
                              <input type="file" accept="image/*" onChange={(e) => handleVariantImageUpload(e, idx)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <input 
                                type="text" 
                                placeholder="Color Name (e.g. Royal Blue)" 
                                value={v.color} 
                                onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                                className="futuristic-input-small"
                                style={{ marginBottom: '0.5rem' }}
                              />
                              <div className="stock-matrix" style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Stock per Size:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.4rem' }}>
                                  {(formData.sizes ? formData.sizes.split(',').map(s => s.trim()) : ['Standard']).map(size => (
                                    <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{size}</span>
                                      <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={(v.stock && v.stock[size]) || 0} 
                                        onChange={(e) => handleVariantStockChange(idx, size, e.target.value)}
                                        className="futuristic-input-small"
                                        style={{ padding: '4px', textAlign: 'center', margin: 0 }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <button type="button" onClick={() => removeVariant(idx)} className="text-accent" style={{ fontSize: '0.75rem', background: 'none', border: 'none', padding: '0.5rem 0 0 0' }}>Remove Color Variant</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
  <input type="checkbox" name="in_stock" checked={formData.in_stock} onChange={handleInputChange} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
  <label style={{ margin: 0 }}>Item is In Stock</label>
</div>

<div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
  <input type="checkbox" name="featured" checked={formData.featured} onChange={handleInputChange} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
  <label style={{ margin: 0 }}>Featured Product (Special Collection)</label>
</div>

<div className="admin-actions">
                    {isEditing && <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>}
                    <button type="submit" className="btn-primary flex-center gap-2">
                      {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                      {isEditing ? 'Update Product' : 'Add Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="admin-list-container">
              <h2>Inventory ({products.length})</h2>
              <div className="admin-products-table glass-panel">
                {products.length === 0 ? <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No products yet.</p> : (
                    <table className="inventory-table">
                      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td><img src={p.image} alt={p.name} className="admin-table-img" /></td>
                            <td className="font-weight-600">{p.name} {p.featured && <span style={{ color: 'var(--accent-color)', fontSize: '0.65rem', padding: '2px 4px', border: '1px solid var(--accent-color)', borderRadius: '4px' }}>FEATURED</span>}</td>
                            <td><span className="badge category-badge">{p.category}</span></td>
                            <td className="text-accent font-weight-600">₹{Number(p.price).toFixed(2)}</td>
                            <td>{p.in_stock === false ? <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Out of Stock</span> : <span style={{ color: '#10b981', fontSize: '0.85rem' }}>In Stock</span>}</td>
                            <td>
                              <div className="table-actions">
                                <button onClick={() => handleEdit(p)} className="icon-btn-small edit-btn" title="Edit"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(p.id)} className="icon-btn-small delete-btn" title="Delete"><Trash2 size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: CATEGORIES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'categories' && (
          <div style={{ maxWidth: '600px' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
              <h2>Add New Category</h2>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <input
                  type="text"
                  placeholder="Category name (e.g. T-Shirts)"
                  className="futuristic-input"
                  style={{ flex: 1 }}
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary flex-center gap-1"><Plus size={18} /> Add</button>
              </form>
            </div>

            <h2>Custom Categories ({categories.length})</h2>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              {categories.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>No categories found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {categories.map(cat => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontWeight: 'bold' }}>{cat}</span>
                      <button onClick={() => handleDeleteCategory(cat)} className="icon-btn-small delete-btn" title="Delete Category"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: ORDERS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2>Orders ({orders.length})</h2>
                {newOrderAlert && <span className="badge badge-success animate-pulse" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem' }}>NEW ORDER!</span>}
              </div>
              <button className="btn-secondary" onClick={() => { loadOrders(); setNewOrderAlert(false); }} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>↻ Refresh</button>
            </div>

            {ordersLoading ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Truck size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No orders yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                  <div key={order.id} className="glass-panel order-card">
                    <div className="order-card-header" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      <div className="order-id-section">
                        <span className="order-id">#{order.id.toString().slice(-8).toUpperCase()}</span>
                        <span className="order-date">{fmtDate(order.created_at)}</span>
                      </div>
                      <div className="order-customer">
                        <strong>{order.customer?.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{order.customer?.phone}</span>
                      </div>
                      <div className="order-total text-accent">₹{Number(order.total).toFixed(2)}</div>
                      <div className="order-badges">
                        <span className="order-badge" style={{ background: statusColor(order.payment_status) + '22', color: statusColor(order.payment_status), border: `1px solid ${statusColor(order.payment_status)}` }}>
                          {order.payment_status === 'received' ? '✓ Paid' : '⏳ Payment Pending'}
                        </span>
                        <span className="order-badge" style={{ background: statusColor(order.delivery_status) + '22', color: statusColor(order.delivery_status), border: `1px solid ${statusColor(order.delivery_status)}` }}>
                          {order.delivery_status === 'delivered' ? 'CLOSED' : (order.delivery_status?.toUpperCase() || 'PENDING')}
                        </span>
                      </div>
                      <button className="icon-btn" style={{ marginLeft: 'auto' }}>
                        {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button className="icon-btn-small delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} title="Delete Order"><Trash2 size={16} /></button>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="order-card-body">
                        <div className="order-detail-grid">
                          <div className="order-detail-section">
                            <h4>📦 Delivery Address</h4>
                            <p><strong>{order.customer?.name}</strong></p>
                            <p>Zone: <span className="text-accent" style={{fontWeight: 'bold'}}>{order.shipping_zone === 'local' ? 'Within 30km' : 'Outside 30km'}</span></p>
                            <p>{order.delivery_address?.address}</p>
                            <p>{order.delivery_address?.cityState} — {order.delivery_address?.pincode}</p>
                            <p>{order.customer?.phone}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{order.customer?.email}</p>
                          </div>

                          <div className="order-detail-section">
                            <h4>💳 Payment Info</h4>
                            <p>GPay Name: <strong>{order.payment_info?.gpayName || '—'}</strong></p>
                            <p>UPI ID: <strong>{order.payment_info?.upiId}</strong></p>
                            <p>GPay No: <strong>{order.payment_info?.gpayPhone}</strong></p>
                            <p>Transaction ID: <strong>{order.payment_info?.transactionId}</strong></p>
                            <p className="text-accent" style={{ fontWeight: 700, marginTop: '0.5rem' }}>Total: ₹{Number(order.total).toFixed(2)}</p>
                          </div>

                          <div className="order-detail-section order-items-section">
                            <h4>🛍️ Items Ordered</h4>
                            {order.items?.map((item, i) => (
                              <div key={i} className="order-item-row">
                                {item.image && <img src={item.image} alt={item.name} />}
                                <div>
                                  <p><strong>{item.name}</strong></p>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty: {item.quantity} | Size: {item.size} | Color: {item.color}</p>
                                </div>
                                <p className="text-accent">₹{(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="order-management-module" style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                          <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={20} className="text-accent" /> ORDER MANAGEMENT SYSTEM
                          </h4>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="status-module-card glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Payment Control</span>
                                <span className={`badge ${order.payment_status}`} style={{ fontSize: '0.7rem' }}>{(order.payment_status || 'PENDING').toUpperCase()}</span>
                              </div>
                              {order.payment_status !== 'received' ? (
                                <button className="btn-primary" style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleOrderUpdate(order.id, 'payment_status', 'received')}><CheckCircle size={18} /> MARK AS PAID</button>
                              ) : (
                                <button className="btn-secondary" style={{ width: '100%', opacity: 0.6 }} onClick={() => handleOrderUpdate(order.id, 'payment_status', 'pending')}><Clock size={16} /> Revert to Pending</button>
                              )}
                            </div>

                            <div className="status-module-card glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Delivery & Process Status</span>
                                <span className={`badge ${order.delivery_status || 'pending'}`} style={{ fontSize: '0.7rem', background: statusColor(order.delivery_status) }}>{(order.delivery_status || 'PENDING').toUpperCase()}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <select 
                                  className="futuristic-input" 
                                  value={order.delivery_status || 'pending'} 
                                  onChange={(e) => handleOrderUpdate(order.id, 'delivery_status', e.target.value)}
                                  style={{ fontSize: '0.8rem', height: '36px' }}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed (Paid)</option>
                                  <option value="packed">Packed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered (Closed)</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div className="tracking-id-module glass-panel" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <Truck size={18} className="text-secondary" />
                              <input 
                                type="text" 
                                placeholder="Add Tracking / Transport No" 
                                defaultValue={order.tracking_id || ''}
                                className="futuristic-input"
                                style={{ flex: 1, height: '40px', fontSize: '0.9rem' }}
                                id={`track-${order.id}`}
                              />
                              <button 
                                className="btn-primary" 
                                style={{ height: '40px', padding: '0 1rem' }}
                                onClick={() => {
                                  const val = document.getElementById(`track-${order.id}`).value;
                                  handleOrderUpdate(order.id, 'tracking_id', val);
                                  alert('Tracking ID Saved!');
                                }}
                              >SAVE</button>
                            </div>
                            <button 
                              className="btn-secondary flex-center gap-2"
                              onClick={() => {
                                const addr = `${order.customer?.name || ''}\n${order.delivery_address?.address || ''}\n${order.delivery_address?.cityState || ''}\nPIN: ${order.delivery_address?.pincode || ''}\nPhone: ${order.customer?.phone || ''}`;
                                navigator.clipboard.writeText(addr.trim());
                                alert('Shipping Address Copied!');
                              }}
                            ><QrCode size={18} /> COPY ADDR</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: CONTACT QUERIES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'queries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Queries ({queries.length}){unreadCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '0.5rem', fontSize: '0.9rem' }}>· {unreadCount} unread</span>}</h2>
              <button className="btn-secondary" onClick={loadQueries} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>↻ Refresh</button>
            </div>

            {queriesLoading ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : queries.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No queries yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queries.map(q => (
                  <div key={q.id} className={`glass-panel query-card ${q.status === 'unread' ? 'query-unread' : ''}`}>
                    <div className="query-header">
                      <div>
                        <strong>{q.name}</strong>
                        {q.status === 'unread' && <span className="unread-dot"></span>}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{q.email} {q.phone && ` | ${q.phone}`}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{fmtDate(q.created_at || q.createdAt)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        {q.status === 'unread' && (
                          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => handleMarkRead(q.id)}><Eye size={14} /> Mark Read</button>
                        )}
                        <button className="icon-btn-small delete-btn" onClick={() => handleDeleteQuery(q.id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="query-message"><p>{q.message}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: APPEARANCE (DATABASE BACKED)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '680px' }}>

            {/* ── Images ── */}
            <div className="admin-form-container glass-panel">
              <h2 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Monitor size={20} /> Website Appearance</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Update images and announcement settings. Changes are saved globally in PostgreSQL.</p>

              <div style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🚚 Shipping Cost Configuration</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Fixed local shipping within 30km is ₹150. Set standard shipping for outside 30km radius.</p>
                <div className="form-group">
                  <label>Standard Shipping Rate (₹)</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input type="number" className="futuristic-input" value={stdShipping} onChange={e => setStdShipping(Number(e.target.value))} style={{ flex: 1 }} />
                    <button className="btn-primary" onClick={saveShippingRate}>Update Rate</button>
                  </div>
                </div>
              </div>

              {[
                { label: 'Home Page Hero Background', key: 'lookwalk_hero_bg', val: heroBg, setter: setHeroBg },
                { label: 'Home Page "What Makes Us Different" Image', key: 'lookwalk_ethos_img', val: ethosImg, setter: setEthosImg },
                { label: 'About Us — Image 1', key: 'lookwalk_about_img_1', val: about1, setter: setAbout1 },
                { label: 'About Us — Image 2', key: 'lookwalk_about_img_2', val: about2, setter: setAbout2 },
              ].map(({ label, key, val, setter }) => (
                <div key={key} className="form-group" style={{ marginBottom: '2rem' }}>
                  <label>{label}</label>
                  {val && <img src={val} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', flex: 1 }}>
                      <button type="button" className="btn-primary flex-center gap-2" style={{ width: '100%' }}><Upload size={18} /> Upload Image</button>
                      <input type="file" accept="image/*" onChange={e => handleAppearanceUpload(e, key, setter)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                    {val && <button type="button" className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => removeAppearanceSetting(key, setter)}>Remove</button>}
                  </div>
                </div>
              ))}
            </div>


          </div>
        )}

      </main>
    </div>
  );
};

export default Admin;
