import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, Loader, Archive, Calendar } from 'lucide-react';
import { fetchOrders } from '../data/apiService';
import './Contact.css'; // Reusing some glass styles

const TrackOrder = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const orders = await fetchOrders(200);
      // Search for order by ID (either full ID or last 8 chars)
      const found = orders.find(o => {
        const sid = String(o.id);
        const searchId = orderId.trim();
        return sid === searchId || (sid.length >= 4 && sid.toUpperCase().endsWith(searchId.toUpperCase()));
      });

      if (found) {
        setOrder(found);
      } else {
        setError('Order not found. Please check your Order ID.');
      }
    } catch (err) {
      console.error('Tracking order failed:', err);
      setError('Failed to fetch order status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'delivered') return '#10b981';
    if (status === 'cancelled') return '#ef4444';
    if (status === 'shipped') return '#06b6d4';
    if (status === 'packed') return '#8b5cf6';
    if (status === 'confirmed') return '#3b82f6';
    return '#f59e0b';
  };

  // Helper to check if a step in the timeline is completed
  const isStepCompleted = (currentStatus, stepName) => {
    const statuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus);
    const stepIndex = statuses.indexOf(stepName);
    
    if (currentIndex === -1 || stepIndex === -1) return false;
    return currentIndex >= stepIndex;
  };

  return (
    <div className="page-wrapper container animate-fade-in-up" style={{ minHeight: '70vh' }}>
      <div className="contact-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="title-glow">Track Your <span className="text-accent">Order</span></h1>
        <p className="contact-subtitle">Enter your Order ID to see the current status of your delivery.</p>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input 
                type="text" 
                placeholder="Enter Order ID (e.g. #A1B2C3D4)" 
                className="futuristic-input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary flex-center gap-2" disabled={loading}>
              {loading ? <Loader size={20} className="spin" /> : <Search size={20} />}
              TRACK
            </button>
          </form>
          {error && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
        </div>

        {order && (
          <div className="glass-panel animate-fade-in-up" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Order #{order.id.toString().slice(-8).toUpperCase()}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge" style={{ background: statusColor(order.delivery_status) + '22', color: statusColor(order.delivery_status), border: `1px solid ${statusColor(order.delivery_status)}` }}>
                  {order.delivery_status?.toUpperCase() || 'PENDING'}
                </span>
                {order.tracking_id && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    TRACKING: {order.tracking_id}
                  </p>
                )}
              </div>
            </div>

            {order.delivery_status === 'cancelled' ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <AlertCircle size={48} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, color: '#ef4444' }}>Order Cancelled</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>This order has been cancelled. If you believe this is an error, please contact customer support.</p>
              </div>
            ) : (
              /* 5-Step Status Progress Timeline */
              <div className="tracking-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* 1. Order Placed */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b98122', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                      <CheckCircle size={20} />
                    </div>
                    <div style={{ flex: 1, width: '2px', background: isStepCompleted(order.delivery_status, 'confirmed') ? '#10b981' : 'var(--glass-border)', margin: '5px 0', minHeight: '30px' }}></div>
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>Order Received</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>We have received your order details and payment submission.</p>
                  </div>
                </div>

                {/* 2. Confirmed */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: isStepCompleted(order.delivery_status, 'confirmed') ? '#3b82f622' : 'transparent', 
                      border: `2px solid ${isStepCompleted(order.delivery_status, 'confirmed') ? '#3b82f6' : 'var(--glass-border)'}`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isStepCompleted(order.delivery_status, 'confirmed') ? '#3b82f6' : 'var(--text-secondary)' 
                    }}>
                      {isStepCompleted(order.delivery_status, 'confirmed') ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div style={{ flex: 1, width: '2px', background: isStepCompleted(order.delivery_status, 'packed') ? '#8b5cf6' : 'var(--glass-border)', margin: '5px 0', minHeight: '30px' }}></div>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: isStepCompleted(order.delivery_status, 'confirmed') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Order Confirmed</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {isStepCompleted(order.delivery_status, 'confirmed') ? 'Payment verified and order has been confirmed.' : 'Waiting for payment verification.'}
                    </p>
                  </div>
                </div>

                {/* 3. Packed */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: isStepCompleted(order.delivery_status, 'packed') ? '#8b5cf622' : 'transparent', 
                      border: `2px solid ${isStepCompleted(order.delivery_status, 'packed') ? '#8b5cf6' : 'var(--glass-border)'}`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isStepCompleted(order.delivery_status, 'packed') ? '#8b5cf6' : 'var(--text-secondary)' 
                    }}>
                      {isStepCompleted(order.delivery_status, 'packed') ? <Archive size={20} /> : <Clock size={20} />}
                    </div>
                    <div style={{ flex: 1, width: '2px', background: isStepCompleted(order.delivery_status, 'shipped') ? '#06b6d4' : 'var(--glass-border)', margin: '5px 0', minHeight: '30px' }}></div>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: isStepCompleted(order.delivery_status, 'packed') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Packed</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {isStepCompleted(order.delivery_status, 'packed') ? 'Your items have been carefully packed and prepared.' : 'Awaiting packaging.'}
                    </p>
                  </div>
                </div>

                {/* 4. Shipped */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: isStepCompleted(order.delivery_status, 'shipped') ? '#06b6d422' : 'transparent', 
                      border: `2px solid ${isStepCompleted(order.delivery_status, 'shipped') ? '#06b6d4' : 'var(--glass-border)'}`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isStepCompleted(order.delivery_status, 'shipped') ? '#06b6d4' : 'var(--text-secondary)' 
                    }}>
                      <Truck size={20} />
                    </div>
                    <div style={{ flex: 1, width: '2px', background: isStepCompleted(order.delivery_status, 'delivered') ? '#10b981' : 'var(--glass-border)', margin: '5px 0', minHeight: '30px' }}></div>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: isStepCompleted(order.delivery_status, 'shipped') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Shipped</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {isStepCompleted(order.delivery_status, 'shipped') ? 'Your order is currently on its way.' : 'Waiting for courier pickup.'}
                    </p>
                  </div>
                </div>

                {/* 5. Delivered */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: isStepCompleted(order.delivery_status, 'delivered') ? '#10b98122' : 'transparent', 
                      border: `2px solid ${isStepCompleted(order.delivery_status, 'delivered') ? '#10b981' : 'var(--glass-border)'}`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isStepCompleted(order.delivery_status, 'delivered') ? '#10b981' : 'var(--text-secondary)' 
                    }}>
                      <Package size={20} />
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: isStepCompleted(order.delivery_status, 'delivered') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Delivered</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {isStepCompleted(order.delivery_status, 'delivered') ? 'Package successfully delivered. Enjoy your lookwalk gear!' : 'Delivery expected soon.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem' }}>Questions about your order? <a href="/contact" className="text-accent">Contact Support</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
