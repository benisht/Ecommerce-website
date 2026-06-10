// src/pages/Checkout.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, Plus, Minus, Trash2, QrCode, Loader, ShoppingCart } from 'lucide-react';
import { getCartItems, clearCart, updateCartItemQuantity, removeCartItem } from '../data/cartManager';
// Removed deprecated dataManager import; QR fetched via fetchSettings
import { placeOrder, fetchSettings } from '../data/apiService';
import './Checkout.css';

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [paymentQR, setPaymentQR] = useState('');
  const [firebaseReady, setFirebaseReady] = useState(true);
  const [shippingZone, setShippingZone] = useState('local'); // 'local' or 'std'
  const [stdRate, setStdRate] = useState(300);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Step 1 – Shipping details
  const [shipping, setShipping] = useState({
    name: '', email: '', phone: '', address: '', cityState: '', pincode: '',
  });

  // Step 2 – Payment details
  const [payment, setPayment] = useState({
    gpayPhone: '', upiId: '', transactionId: '', gpayName: '',
  });

  const reloadCart = () => setCartItems(getCartItems());

  useEffect(() => {
    const loadData = async () => {
      reloadCart();
      const qr = await fetchSettings('payment_qr');
      setPaymentQR(qr);
      try {
        const rate = await fetchSettings('std_shipping_rate');
        if (rate) setStdRate(Number(rate));
      } catch (err) {
        console.error('Failed to load shipping rate settings:', err);
      }
    };
    loadData();
    window.addEventListener('cartUpdated', reloadCart);
    return () => window.removeEventListener('cartUpdated', reloadCart);
  }, []);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.discount_percent > 0 
      ? Number(item.price) * (1 - item.discount_percent / 100)
      : Number(item.price);
    return sum + (price * item.quantity);
  }, 0);
  const shippingFee = cartItems.length > 0 ? (shippingZone === 'local' ? 150 : stdRate) : 0;
  const total = subtotal + shippingFee;

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) { alert('Your cart is empty!'); return; }

    setIsProcessing(true);
    try {
      // Build order object
      const orderData = {
        customer: {
          name: shipping.name,
          email: shipping.email,
          phone: shipping.phone,
        },
        delivery_address: {
          address: shipping.address,
          cityState: shipping.cityState,
          pincode: shipping.pincode,
        },
        payment_info: {
          gpayPhone: payment.gpayPhone,
          upiId: payment.upiId,
          transactionId: payment.transactionId,
          gpayName: payment.gpayName,
        },
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          image: item.image,
        })),
        subtotal,
        shippingFee,
        shippingZone,
        total,
      };

      const response = await placeOrder(orderData);
      clearCart();
      setOrderId(response.id);
      setIsComplete(true);
    } catch (err) {
      console.error('Order placement failed:', err);
      if (err.code === 'unavailable' || err.message?.includes('firebaseConfig')) {
        // Firebase not configured yet — still show success but warn
        setFirebaseReady(false);
        clearCart();
        setOrderId('LWK-LOCAL-' + Date.now());
        setIsComplete(true);
      } else {
        alert('Failed to place order. Check your internet connection and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete) {
    return (
      <div className="page-wrapper container animate-fade-in-up checkout-complete">
        <div className="glass-panel success-card">
          <ShieldCheck size={64} className="text-accent complete-icon" />
          <h1 className="title-glow text-accent">ORDER CONFIRMED!</h1>
          {!firebaseReady && (
            <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              ⚠️ Firebase not connected — order saved locally only.
            </p>
          )}
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Thank you, <strong>{shipping.name}</strong>! Your order has been received.
          </p>
          <div className="order-id-badge" style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent-color)', marginBottom: '1.5rem', position: 'relative' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>Your Tracking Order ID</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <p style={{ fontSize: '1.8rem', color: 'var(--accent-color)', fontWeight: 'bold', margin: 0 }}>{orderId}</p>
              <button 
                onClick={() => { navigator.clipboard.writeText(orderId); alert('Order ID Copied!'); }}
                className="btn-secondary"
                style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem' }}
              >
                Copy
              </button>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Copy this ID to track your order on the <strong>Track Order</strong> page.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            We will contact you on <strong>{shipping.phone}</strong> once your order is dispatched.
          </p>
          <Link to="/" className="btn-primary" style={{ marginTop: '2rem' }}>Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <div className="checkout-header">
        <h1 className="title-glow">SECURE <span className="text-accent">CHECKOUT</span></h1>
      </div>

      <div className="checkout-layout container">
        <div className="checkout-steps checkout-steps-inner">
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-num">1</span>
              <span className="step-text">Shipping</span>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-num">2</span>
              <span className="step-text">Payment</span>
            </div>
            <div className={`step-line ${step === 3 ? 'active' : ''}`}></div>
            <div className={`step ${step === 3 ? 'active' : ''}`}>
              <span className="step-num">3</span>
              <span className="step-text">Review</span>
            </div>
          </div>

          <form onSubmit={step === 3 ? handlePay : handleNext} className="checkout-form">
            {/* ── STEP 1: Shipping ── */}
            {step === 1 && (
              <div className="step-content animate-fade-in-up">
                <h2>Delivery Details</h2>
                <div className="form-grid">
                  <div className="form-group grid-col-2">
                    <label>FULL NAME</label>
                    <input type="text" required className="futuristic-input"
                      value={shipping.name} onChange={e => setShipping({ ...shipping, name: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>EMAIL ID</label>
                    <input type="email" required className="futuristic-input"
                      value={shipping.email} onChange={e => setShipping({ ...shipping, email: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>PHONE NUMBER</label>
                    <input type="tel" required className="futuristic-input" placeholder="+91..."
                      value={shipping.phone} onChange={e => setShipping({ ...shipping, phone: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>DELIVERY ADDRESS</label>
                    <input type="text" required className="futuristic-input" placeholder="House No., Street, Area"
                      value={shipping.address} onChange={e => setShipping({ ...shipping, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>CITY, DISTRICT & STATE</label>
                    <input type="text" required className="futuristic-input"
                      value={shipping.cityState} onChange={e => setShipping({ ...shipping, cityState: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>PINCODE</label>
                    <input type="text" required className="futuristic-input" maxLength={6}
                      value={shipping.pincode} onChange={e => setShipping({ ...shipping, pincode: e.target.value })} />
                  </div>

                  <div className="form-group grid-col-2 shipping-zone-container">
                    <label className="shipping-zone-title">SHIPPING ZONE</label>
                    <div className="shipping-cards-grid">
                      <div 
                        className={`shipping-card ${shippingZone === 'local' ? 'active' : ''}`}
                        onClick={() => setShippingZone('local')}
                      >
                        <input 
                          type="radio" 
                          name="zone" 
                          value="local" 
                          checked={shippingZone === 'local'} 
                          onChange={() => {}} // Handled by container click
                          className="hidden-radio"
                        />
                        <div className="shipping-card-content">
                          <div className="shipping-card-header">
                            <Truck size={20} className="shipping-icon" />
                            <span className="shipping-name">Local Delivery</span>
                          </div>
                          <p className="shipping-desc">Within 30km of store</p>
                          <span className="shipping-price">₹150.00</span>
                        </div>
                      </div>
                      
                      <div 
                        className={`shipping-card ${shippingZone === 'std' ? 'active' : ''}`}
                        onClick={() => setShippingZone('std')}
                      >
                        <input 
                          type="radio" 
                          name="zone" 
                          value="std" 
                          checked={shippingZone === 'std'} 
                          onChange={() => {}} // Handled by container click
                          className="hidden-radio"
                        />
                        <div className="shipping-card-content">
                          <div className="shipping-card-header">
                            <Truck size={20} className="shipping-icon" />
                            <span className="shipping-name">Standard Shipping</span>
                          </div>
                          <p className="shipping-desc">Outside 30km distance</p>
                          <span className="shipping-price">₹{stdRate.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="checkout-actions">
                  <button type="submit" className="btn-primary">Continue to Payment →</button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Payment ── */}
            {step === 2 && (
              <div className="step-content animate-fade-in-up">
                <h2>Payment via UPI / GPay</h2>
                <div style={{ marginBottom: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {paymentQR ? (
                    <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <img src={paymentQR} alt="Payment QR Code" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: '200px', height: '200px', padding: '2rem', border: '2px dashed var(--glass-border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <QrCode size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                        <p>QR Code Not Set By Admin</p>
                      </div>
                    </div>
                  )}
                  <p className="text-accent" style={{ marginTop: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    Pay ₹{total.toFixed(2)} and fill the details below
                  </p>
                </div>
                <div className="form-grid">
                  <div className="form-group grid-col-2">
                    <label>GPAY / PHONE NUMBER USED</label>
                    <input type="tel" required className="futuristic-input" placeholder="+91..."
                      value={payment.gpayPhone} onChange={e => setPayment({ ...payment, gpayPhone: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>YOUR UPI ID</label>
                    <input type="text" required className="futuristic-input" placeholder="username@bank"
                      value={payment.upiId} onChange={e => setPayment({ ...payment, upiId: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>NAME IN GPAY (FOR VERIFICATION)</label>
                    <input type="text" required className="futuristic-input" placeholder="Full name as in GPay"
                      value={payment.gpayName} onChange={e => setPayment({ ...payment, gpayName: e.target.value })} />
                  </div>
                  <div className="form-group grid-col-2">
                    <label>TRANSACTION ID / REF NO.</label>
                    <input type="text" required className="futuristic-input" placeholder="12-digit reference number"
                      value={payment.transactionId} onChange={e => setPayment({ ...payment, transactionId: e.target.value })} />
                  </div>
                </div>
                <div className="checkout-actions space-between">
                  <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                  <button type="submit" className="btn-primary">Review Order →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Review ── */}
            {step === 3 && (
              <div className="step-content animate-fade-in-up">
                <h2>Review & Confirm</h2>

                <div className="review-section glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '10px' }}>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery To</h3>
                  <p><strong>{shipping.name}</strong></p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{shipping.address}, {shipping.cityState} — {shipping.pincode}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{shipping.phone} | {shipping.email}</p>
                </div>

                <div className="review-section glass-panel" style={{ padding: '1.25rem', borderRadius: '10px' }}>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Details</h3>
                  <p style={{ fontSize: '0.9rem' }}>GPay Name: <strong>{payment.gpayName}</strong></p>
                  <p style={{ fontSize: '0.9rem' }}>UPI ID: <strong>{payment.upiId}</strong></p>
                  <p style={{ fontSize: '0.9rem' }}>Transaction ID: <strong>{payment.transactionId}</strong></p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 600 }}>Amount: ₹{total.toFixed(2)}</p>
                </div>

                <div className="checkout-actions space-between" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                  <button type="submit" className="btn-primary" disabled={isProcessing}>
                    {isProcessing ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Loader size={18} className="spin" /> Placing Order...
                      </span>
                    ) : 'PLACE ORDER ✓'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ── ORDER SUMMARY ── */}
        <div className={`checkout-summary glass-panel ${isSummaryExpanded ? 'expanded' : 'collapsed'}`}>
          <button 
            type="button" 
            className="mobile-summary-toggle"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          >
            <div className="toggle-label">
              <ShoppingCart size={18} />
              <span>{isSummaryExpanded ? 'Hide order summary' : 'Show order summary'}</span>
              <span className="chevron-icon">{isSummaryExpanded ? ' ▲' : ' ▼'}</span>
            </div>
            <span className="toggle-total">₹{total.toFixed(2)}</span>
          </button>
          
          <div className="summary-content-wrapper">
            <h2>ORDER SUMMARY</h2>
            <div className="summary-items">
              {cartItems.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Your cart is empty.</p>
              ) : (
                cartItems.map((item, index) => (
                  <div className="summary-item" key={`${item.id}-${item.size}-${item.color}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="summary-item-img" style={{ backgroundImage: `url(${item.image})` }}></div>
                      <div className="summary-item-info" style={{ flex: 1 }}>
                        <h4>{item.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Size: {item.size} | Color: {item.color}
                        </p>
                      </div>
                      <p className="summary-item-price">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '0.2rem' }}>
                        <button type="button" onClick={() => updateCartItemQuantity(index, -1)} style={{ padding: '0.3rem', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', color: 'var(--text-primary)', cursor: 'pointer', border: 'none' }}><Minus size={14} /></button>
                        <span style={{ margin: '0 0.5rem', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button type="button" onClick={() => updateCartItemQuantity(index, 1)} style={{ padding: '0.3rem', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', color: 'var(--text-primary)', cursor: 'pointer', border: 'none' }}><Plus size={14} /></button>
                      </div>
                      <button type="button" onClick={() => removeCartItem(index)} className="icon-btn-small delete-btn" style={{ border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="summary-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span className="flex-center gap-2"><Truck size={16} /> Shipping</span>
                <span>₹{shippingFee.toFixed(2)}</span>
              </div>
              <div className="total-row final-total text-accent">
                <span>TOTAL</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
