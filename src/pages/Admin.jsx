// src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import {
  getPaymentQR, setPaymentQR, deletePaymentQR
} from '../data/dataManager';
import {
  fetchOrders, updateOrderStatus, deleteOrder,
  fetchContactQueries, markQueryRead, deleteQuery,
  addProduct, updateProduct, deleteProduct, fetchProducts, fetchProductById,
  fetchSettings, updateSettings
} from '../data/apiService';
import {
  Edit2, Trash2, Plus, ShieldAlert, QrCode, Upload, Monitor,
  Package, MessageSquare, CheckCircle, Truck, Clock, XCircle, ShieldCheck,
  LayoutDashboard, ChevronDown, ChevronUp, Eye, Mail, Search,
  ShoppingCart, Settings, LogOut
} from 'lucide-react';
import './Admin.css';

// ─── helpers ────────────────────────────────────────────────────────────────
const statusColor = (status) => {
  if (!status || status === 'pending') return '#f59e0b';
  if (status === 'received' || status === 'dispatched' || status === 'delivered') return '#10b981';
  return '#6b7280';
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

// ─── main component ──────────────────────────────────────────────────────────
const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('lookwalk_admin') === 'true');
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // Default to orders as requested

  // Products
  const [products, setProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Contact queries
  const [queries, setQueries] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);

  // Payment
  const [qrUrl, setQrUrl] = useState(getPaymentQR());

  // Appearance
  const [heroBg, setHeroBg] = useState(localStorage.getItem('lookwalk_hero_bg') || '');
  const [ethosImg, setEthosImg] = useState(localStorage.getItem('lookwalk_ethos_img') || '');
  const [about1, setAbout1] = useState(localStorage.getItem('lookwalk_about_img_1') || '');
  const [about2, setAbout2] = useState(localStorage.getItem('lookwalk_about_img_2') || '');
  const [banner, setBanner] = useState({ image: '', text: '', active: false });
  const [stdShipping, setStdShipping] = useState(300); // Default standard rate

  const initialForm = { name: '', price: '', category: '', image: '', description: '', in_stock: true, sizes: 'S, M, L, XL', variants: [], discount_percent: 0 };
  const [formData, setFormData] = useState(initialForm);
  const [dbStatus, setDbStatus] = useState('checking'); // checking, connected, disconnected
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // ── load products ──────────────────────────────────────────────────────────
  const loadProducts = async () => {
    setProductLoading(true);
    try {
      const fetched = await fetchProducts();
      if (fetched.length > 0) {
        setProducts(fetched);
      } else {
        setProducts(getProducts()); // local fallback
      }
    } catch {
      setProducts(getProducts()); // local fallback if Firebase not ready
    }
    setProductLoading(false);
  };

  // ── load orders ────────────────────────────────────────────────────────────
  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const fetched = await fetchOrders();
      setOrders(fetched);
    } catch (err) {
      console.warn('Orders fetch failed:', err.message);
    }
    setOrdersLoading(false);
  };

  // ── load contact queries ───────────────────────────────────────────────────
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

  useEffect(() => {
    if (!isAuthenticated) return;
    loadProducts();
    loadOrders();
    loadQueries();
    loadExtraSettings();
    window.addEventListener('productsUpdated', loadProducts);
    return () => window.removeEventListener('productsUpdated', loadProducts);
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
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'orders' && orders.length === 0) loadOrders();
    if (activeTab === 'queries' && queries.length === 0) loadQueries();
  }, [activeTab, isAuthenticated]);

  // Real-time polling for new orders
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = async () => {
      try {
        const fetched = await fetchOrders();
        if (fetched.length > lastOrderCount && lastOrderCount !== 0) {
          setNewOrderAlert(true);
          // Auto-play a subtle sound if possible or just show the red dot
        }
        setOrders(fetched);
        setLastOrderCount(fetched.length);
      } catch (err) {
        console.warn('Polling failed');
      }
    };
    const id = setInterval(poll, 10000); // every 10s
    return () => clearInterval(id);
  }, [isAuthenticated, lastOrderCount]);

  // ── login ──────────────────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.userId === 'admin' && loginForm.password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('lookwalk_admin', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid User ID or Password.');
    }
  };

  // ── product form ───────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'price' || name === 'discount_percent' ? Number(value) : value)
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      const compressed = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for faster loading
      setFormData(f => ({ ...f, image: compressed }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

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
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 600, maxH = 600;
      let { width, height } = img;
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.6);
      handleVariantChange(index, 'image', compressed);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };


  const loadExtraSettings = async () => {
    try {
      const b = await fetchSettings('home_banner');
      if (b) setBanner(b);
      const s = await fetchSettings('std_shipping_rate');
      if (s) setStdShipping(Number(s));
    } catch (err) { console.error('Error loading extra settings:', err); }
  };

  const saveBanner = async () => {
    try {
      await updateSettings('home_banner', banner);
      alert('Banner updated!');
    } catch { alert('Failed to save banner.'); }
  };

  const saveShippingRate = async () => {
    try {
      await updateSettings('std_shipping_rate', stdShipping);
      alert('Shipping rate updated!');
    } catch { alert('Failed to save shipping rate.'); }
  };

  const handleBannerImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1200;
      let { width, height } = img;
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      setBanner({ ...banner, image: canvas.toDataURL('image/jpeg', 0.8) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

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
        console.log('Updating product:', currentId, finalData);
        await updateProduct(currentId, finalData);
        alert('Product updated successfully!');
      } else {
        console.log('Adding product:', finalData);
        await addProduct(finalData);
        alert('Product added successfully!');
      }
    } catch (error) {
      alert('Failed to save product. Check console for details.');
      console.error('Product save error:', error);
    }
    await loadProducts();
    setIsEditing(false);
    setCurrentId(null);
    setFormData(initialForm);
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
        description: fullProduct.description || '',
        in_stock: fullProduct.in_stock === undefined ? true : !!fullProduct.in_stock,
        sizes: fullProduct.sizes ? fullProduct.sizes.join(', ') : '',
        variants: (fullProduct.variants || []).map(v => ({ 
          ...v, 
          stock: typeof v.stock === 'object' ? v.stock : { 'Default': v.stock || 0 } 
        })),
        discount_percent: fullProduct.discount_percent || 0
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading product for edit:', err);
      alert('Failed to load product details. Check console.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
    } catch (error) {
      alert('Failed to delete product. Check console for details.');
      console.error('Product delete error:', error);
    }
    await loadProducts();
  };

  const cancelEdit = () => { setIsEditing(false); setCurrentId(null); setFormData(initialForm); };

  // ── QR ────────────────────────────────────────────────────────────────────
  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPaymentQR(reader.result); setQrUrl(reader.result); alert('QR saved!'); };
    reader.readAsDataURL(file);
  };

  // ── Appearance ────────────────────────────────────────────────────────────
  const compressAndSave = (file, storageKey, setter) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
      if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(objectUrl);
      try {
        localStorage.setItem(storageKey, compressed);
        setter(compressed);
        window.dispatchEvent(new CustomEvent('appearanceUpdated', { detail: { key: storageKey } }));
        alert('✅ Image updated successfully!');
      } catch {
        alert('⚠️ Storage full! Use a smaller image.');
      }
    };
    img.src = objectUrl;
  };

  const handleAppearanceUpload = (e, key, setter) => {
    const file = e.target.files[0];
    if (file) compressAndSave(file, key, setter);
  };

  const removeAppearance = (key, setter) => {
    localStorage.removeItem(key);
    setter('');
    window.dispatchEvent(new Event('appearanceUpdated'));
  };

  // ── Order status helpers ───────────────────────────────────────────────────
  const handleOrderUpdate = async (orderId, field, value) => {
    try {
      await updateOrderStatus(orderId, field, value);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));
    } catch (err) {
      alert('Failed to update. Check backend connection.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { alert('Failed to delete order.'); }
  };

  // ── Query helpers ──────────────────────────────────────────────────────────
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

  const distinctCategories = ['Hoodies', 'Watches', 'Glasses', 'Shirts', ...new Set(products.map(p => p.category))];
  const unreadCount = queries.filter(q => q.status === 'unread').length;
  const pendingPayments = orders.filter(o => o.payment_status === 'pending').length;
  const pendingDeliveries = orders.filter(o => o.delivery_status !== 'delivered').length;

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="page-wrapper container animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', margin: '0 0 2rem' }}>
            <ShieldAlert size={40} className="text-accent" style={{ marginBottom: '1rem' }} />
            <h2 className="title-glow text-accent" style={{ margin: 0 }}>ADMIN PANEL</h2>
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
          <button className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <Package size={20} /> <span>Inventory</span>
          </button>
          <button className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <Truck size={20} /> <span>Orders</span>
            {pendingPayments > 0 && <span className="nav-count warn">{pendingPayments}</span>}
          </button>
          <button className={`admin-nav-item ${activeTab === 'queries' ? 'active' : ''}`} onClick={() => setActiveTab('queries')}>
            <MessageSquare size={20} /> <span>Queries</span>
            {unreadCount > 0 && <span className="nav-count glow">{unreadCount}</span>}
          </button>
          <button className={`admin-nav-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => { setActiveTab('appearance'); }}>
            <Monitor size={20} /> <span>Appearance</span>
          </button>
          <button className={`admin-nav-item ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
            <QrCode size={20} /> <span>Payment QR</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem('lookwalk_admin'); }} className="admin-nav-item logout">
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

        {/* ── Stats row ── */}
        <div className="admin-stats-row">
          <div className="stat-card glass-panel">
            <div className="stat-icon"><Package size={22} className="text-accent" /></div>
            <div><p className="stat-num">{products.length}</p><p className="stat-label">Total Products</p></div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon"><Truck size={22} className="text-accent" /></div>
            <div><p className="stat-num">{orders.length}</p><p className="stat-label">Total Orders</p></div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon"><Clock size={22} style={{ color: '#f59e0b' }} /></div>
            <div><p className="stat-num" style={{ color: '#f59e0b' }}>{pendingPayments}</p><p className="stat-label">Unpaid Orders</p></div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon"><Mail size={22} className="text-accent" /></div>
            <div><p className="stat-num">{unreadCount}</p><p className="stat-label">New Queries</p></div>
          </div>
        </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PRODUCTS
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
                  <input list="category-options" type="text" name="category" value={formData.category} onChange={handleInputChange} required className="futuristic-input" placeholder="Select or type..." />
                  <datalist id="category-options">{distinctCategories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="form-group">
                  <label>Product Image</label>
                  {formData.image && <div style={{ marginBottom: '1rem', background: '#fff', padding: '10px', borderRadius: '8px', display: 'inline-block' }}><img src={formData.image} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'contain' }} /></div>}
                  <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                    <button type="button" className="btn-secondary flex-center gap-2" style={{ width: '100%' }}><Upload size={18} />{formData.image ? 'Change Photo...' : 'Browse Photo...'}</button>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} required={!formData.image} />
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
              {productLoading ? <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p> :
                products.length === 0 ? <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No products yet.</p> : (
                  <table className="inventory-table">
                    <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td><img src={p.image} alt={p.name} className="admin-table-img" /></td>
                          <td className="font-weight-600">{p.name}</td>
                          <td><span className="badge category-badge">{p.category}</span></td>
                          <td className="text-accent font-weight-600">₹{Number(p.price).toFixed(2)}</td>
                          <td>{p.in_stock === false ? <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Out of Stock</span> : <span style={{ color: '#10b981', fontSize: '0.85rem' }}>In Stock</span>}</td>
                          <td>
                            <div className="table-actions">
                              <button onClick={() => handleEdit(p)} className="icon-btn-small edit-btn" title="Edit"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(p.id)} className="icon-btn-small delete-btn" title="Delete"><Trash2 size={16} /></button>
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
          TAB: ORDERS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2>Orders ({orders.length})</h2>
              {newOrderAlert && (
                <span className="badge badge-success animate-pulse" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem' }}>
                  NEW ORDER RECEIVED!
                </span>
              )}
            </div>
            <button className="btn-secondary" onClick={() => { loadOrders(); setNewOrderAlert(false); }} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>↻ Refresh</button>
          </div>

          {ordersLoading ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Truck size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No orders yet. Orders will appear here once customers place them.</p>
              <small style={{ color: '#f59e0b' }}>Make sure Firebase is configured and Firestore is enabled.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => (
                <div key={order.id} className="glass-panel order-card">
                  {/* Order header */}
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
                        {order.delivery_status === 'delivered' ? '✓ Delivered' : order.delivery_status === 'dispatched' ? '🚚 Dispatched' : '⏳ Transport Pending'}
                      </span>
                    </div>
                    <button className="icon-btn" style={{ marginLeft: 'auto' }}>
                      {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button className="icon-btn-small delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} title="Delete Order"><Trash2 size={16} /></button>
                  </div>

                  {/* Expanded order details */}
                  {expandedOrder === order.id && (
                    <div className="order-card-body">
                      <div className="order-detail-grid">
                        {/* Delivery address */}
                        <div className="order-detail-section">
                          <h4>📦 Delivery Address</h4>
                          <p><strong>{order.customer?.name}</strong></p>
                          <p>Zone: <span className="text-accent" style={{fontWeight: 'bold'}}>{order.shipping_zone === 'local' ? 'Within 30km' : 'Outside 30km'}</span></p>
                          <p>{order.delivery_address?.address}</p>
                          <p>{order.delivery_address?.cityState} — {order.delivery_address?.pincode}</p>
                          <p>{order.customer?.phone}</p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{order.customer?.email}</p>
                        </div>

                        {/* Payment info */}
                        <div className="order-detail-section">
                          <h4>💳 Payment Info</h4>
                          <p>GPay Name: <strong>{order.payment_info?.gpayName || '—'}</strong></p>
                          <p>UPI ID: <strong>{order.payment_info?.upiId}</strong></p>
                          <p>GPay No: <strong>{order.payment_info?.gpayPhone}</strong></p>
                          <p>Transaction ID: <strong>{order.payment_info?.transactionId}</strong></p>
                          <p className="text-accent" style={{ fontWeight: 700, marginTop: '0.5rem' }}>Total: ₹{Number(order.total).toFixed(2)}</p>
                        </div>

                        {/* Items */}
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

                      {/* NEW: Dedicated Status Management Module */}
                      <div className="order-management-module" style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                        <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ShieldCheck size={20} className="text-accent" /> ORDER MANAGEMENT SYSTEM
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          {/* Payment Column */}
                          <div className="status-module-card glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Step 1: Payment Control</span>
                              <span className={`badge ${(order.payment_status || 'pending')}`} style={{ fontSize: '0.7rem' }}>
                                {(order.payment_status || 'PENDING').toString().toUpperCase()}
                              </span>
                            </div>
                            {order.payment_status !== 'received' ? (
                              <button 
                                className="btn-primary" 
                                style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
                                onClick={() => handleOrderUpdate(order.id, 'payment_status', 'received')}
                              >
                                <CheckCircle size={18} /> MARK AS PAID
                              </button>
                            ) : (
                              <button 
                                className="btn-secondary" 
                                style={{ width: '100%', opacity: 0.6 }}
                                onClick={() => handleOrderUpdate(order.id, 'payment_status', 'pending')}
                              >
                                <Clock size={16} /> Revert to Pending
                              </button>
                            )}
                          </div>

                          {/* Delivery Column */}
                          <div className="status-module-card glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Step 2: Transport & Delivery</span>
                              <span className={`badge ${order.delivery_status || 'pending'}`} style={{ fontSize: '0.7rem' }}>
                                {(order.delivery_status || 'PENDING').toString().toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {order.delivery_status === 'pending' && (
                                <button 
                                  className="btn-primary" 
                                  style={{ width: '100%', background: '#3b82f6', borderColor: '#3b82f6' }}
                                  onClick={() => handleOrderUpdate(order.id, 'delivery_status', 'dispatched')}
                                >
                                  <Truck size={18} /> DISPATCH ORDER
                                </button>
                              )}
                              {order.delivery_status === 'dispatched' && (
                                <button 
                                  className="btn-primary" 
                                  style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
                                  onClick={() => handleOrderUpdate(order.id, 'delivery_status', 'delivered')}
                                >
                                  <CheckCircle size={18} /> MARK AS DELIVERED
                                </button>
                              )}
                              {order.delivery_status === 'delivered' && (
                                <p style={{ textAlign: 'center', color: '#10b981', fontSize: '0.9rem', padding: '0.5rem' }}>✓ Order Lifecycle Complete</p>
                              )}
                              <select 
                                className="futuristic-input" 
                                value={order.delivery_status || 'pending'} 
                                onChange={(e) => handleOrderUpdate(order.id, 'delivery_status', e.target.value)}
                                style={{ fontSize: '0.8rem', height: '36px' }}
                              >
                                <option value="pending">Set Pending</option>
                                <option value="dispatched">Set Dispatched</option>
                                <option value="delivered">Set Delivered</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Tracking ID and Copy Address */}
                        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                          <div className="tracking-id-module glass-panel" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Truck size={18} className="text-secondary" />
                            <input 
                              type="text" 
                              placeholder="Add Transport No / Tracking ID" 
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
                          >
                            <QrCode size={18} /> COPY ADDR
                          </button>
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
            <h2>Customer Queries ({queries.length}){unreadCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '0.5rem', fontSize: '0.9rem' }}>· {unreadCount} unread</span>}</h2>
            <button className="btn-secondary" onClick={loadQueries} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>↻ Refresh</button>
          </div>

          {queriesLoading ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading queries...</div>
          ) : queries.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No queries yet. Contact form submissions will appear here.</p>
              <small style={{ color: '#f59e0b' }}>Make sure Firebase is configured.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {queries.map(q => (
                <div key={q.id} className={`glass-panel query-card ${q.status === 'unread' ? 'query-unread' : ''}`}>
                  <div className="query-header">
                    <div>
                      <strong>{q.name}</strong>
                      {q.status === 'unread' && <span className="unread-dot"></span>}
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{q.email} {q.phone && ` | ${q.phone}`}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{fmtDate(q.createdAt || q.created_at)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      {q.status === 'unread' && (
                        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => handleMarkRead(q.id)}>
                          <Eye size={14} /> Mark Read
                        </button>
                      )}
                      <button className="icon-btn-small delete-btn" onClick={() => handleDeleteQuery(q.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="query-message">
                    <p>{q.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: APPEARANCE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'appearance' && (
        <div className="admin-form-container glass-panel" style={{ maxWidth: '600px' }}>
          <h2 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Monitor size={20} /> Website Appearance</h2>

          {/* ── Home Page Banner Section ── */}
          <div style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px solid var(--accent-color)', borderRadius: '12px', background: 'rgba(var(--accent-rgb), 0.03)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📢 HOME PAGE NEWS/SALE BANNER</h3>
            <div className="form-group">
              <label>Banner Text / Announcement</label>
              <input type="text" className="futuristic-input" value={banner.text} onChange={e => setBanner({...banner, text: e.target.value})} placeholder="e.g. FLASH SALE: 50% OFF ALL HOODIES!" />
            </div>
            <div className="form-group">
              <label>Banner Image Portion</label>
              {banner.image && <img src={banner.image} alt="Banner Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
              <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                <button type="button" className="btn-secondary flex-center gap-2" style={{ width: '100%' }}><Upload size={18} /> {banner.image ? 'Change Banner Image...' : 'Upload Banner Image...'}</button>
                <input type="file" accept="image/*" onChange={handleBannerImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input type="checkbox" checked={banner.active} onChange={e => setBanner({...banner, active: e.target.checked})} style={{ width: '20px', height: '20px' }} />
              <label style={{ margin: 0 }}>Banner is Active/Visible</label>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={saveBanner}>Save Banner Changes</button>
          </div>

          {/* ── Shipping Rate Configuration ── */}
          <div style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🚚 SHIPPING RATE CONFIGURATION</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Local shipping (within 30km) is fixed at ₹150. Set the rate for all other deliveries.</p>
            <div className="form-group">
              <label>Standard Shipping Rate (Above 30km)</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" className="futuristic-input" value={stdShipping} onChange={e => setStdShipping(e.target.value)} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={saveShippingRate}>Update Rate</button>
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Upload images to update the live site. Images are automatically compressed.</p>

          {[
            { label: 'Home Page Hero Background', key: 'lookwalk_hero_bg', val: heroBg, setter: setHeroBg },
            { label: 'Home Page "What Makes Us Different" Image', key: 'lookwalk_ethos_img', val: ethosImg, setter: setEthosImg },
            { label: 'About Us — Image 1', key: 'lookwalk_about_img_1', val: about1, setter: setAbout1 },
            { label: 'About Us — Image 2', key: 'lookwalk_about_img_2', val: about2, setter: setAbout2 },
          ].map(({ label, key, val, setter }) => (
            <div key={key} className="form-group" style={{ marginBottom: '2rem' }}>
              <label>{label}</label>
              {val && <img src={val} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', flex: 1 }}>
                  <button type="button" className="btn-primary flex-center gap-2" style={{ width: '100%', cursor: 'pointer' }}><Upload size={18} /> Browse...</button>
                  <input type="file" accept="image/*" onChange={e => handleAppearanceUpload(e, key, setter)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                </div>
                {val && <button type="button" className="btn-secondary" style={{ color: '#ef4444', padding: '0 1rem', flexShrink: 0 }} onClick={() => removeAppearance(key, setter)}>Remove</button>}
              </div>
            </div>
          ))}

          <button type="button" className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: '#ef4444' }}
            onClick={() => {
              if (!window.confirm('Clear ALL uploaded appearance images?')) return;
              ['lookwalk_hero_bg', 'lookwalk_ethos_img', 'lookwalk_about_img_1', 'lookwalk_about_img_2'].forEach(k => localStorage.removeItem(k));
              setHeroBg(''); setEthosImg(''); setAbout1(''); setAbout2('');
              window.dispatchEvent(new Event('appearanceUpdated'));
              alert('All appearance images cleared.');
            }}>🗑 Reset All Appearance Images</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PAYMENT QR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payment' && (
        <div className="admin-form-container glass-panel" style={{ maxWidth: '500px' }}>
          <h2 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}><QrCode size={20} /> Payment QR Code</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>This QR code appears on the checkout page for customers to pay via UPI/GPay.</p>
          {qrUrl ? (
            <div style={{ marginBottom: '1.5rem', background: '#fff', padding: '15px', borderRadius: '8px', display: 'inline-block' }}>
              <img src={qrUrl} alt="QR" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
              <button type="button" onClick={() => { deletePaymentQR(); setQrUrl(''); }} className="btn-secondary" style={{ display: 'block', marginTop: '1rem', color: '#ef4444', width: '100%' }}>Delete QR</button>
            </div>
          ) : <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No QR Code set.</p>}
          <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
            <button type="button" className="btn-primary flex-center gap-2" style={{ width: '100%', cursor: 'pointer' }}><Upload size={18} /> Browse QR Image...</button>
            <input type="file" accept="image/*" onChange={handleQRUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default Admin;
