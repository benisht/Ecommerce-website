import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
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
      const orders = await fetchOrders();
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
    if (status === 'delivered' || status === 'received') return '#10b981';
    if (status === 'dispatched') return '#3b82f6';
    return '#f59e0b';
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

            {/* Tracking Timeline */}
            <div className="tracking-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b98122', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <CheckCircle size={20} />
                  </div>
                  <div style={{ flex: 1, width: '2px', background: order.payment_status === 'received' ? '#10b981' : 'var(--glass-border)', margin: '5px 0' }}></div>
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>Order Received</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>We have received your order and it's being processed.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: order.payment_status === 'received' ? '#10b98122' : 'transparent', 
                    border: `2px solid ${order.payment_status === 'received' ? '#10b981' : 'var(--glass-border)'}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: order.payment_status === 'received' ? '#10b981' : 'var(--text-secondary)' 
                  }}>
                    {order.payment_status === 'received' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div style={{ flex: 1, width: '2px', background: order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? '#3b82f6' : 'var(--glass-border)', margin: '5px 0' }}></div>
                </div>
                <div>
                  <h4 style={{ margin: 0, color: order.payment_status === 'received' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Payment Verified</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {order.payment_status === 'received' ? 'Your payment has been successfully verified.' : 'Payment verification is pending.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? '#3b82f622' : 'transparent', 
                    border: `2px solid ${order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? '#3b82f6' : 'var(--glass-border)'}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? '#3b82f6' : 'var(--text-secondary)' 
                  }}>
                    <Truck size={20} />
                  </div>
                  <div style={{ flex: 1, width: '2px', background: order.delivery_status === 'delivered' ? '#10b981' : 'var(--glass-border)', margin: '5px 0' }}></div>
                </div>
                <div>
                  <h4 style={{ margin: 0, color: order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Dispatched</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {order.delivery_status === 'dispatched' || order.delivery_status === 'delivered' ? 'Your order is on its way to you.' : 'Waiting for dispatch.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: order.delivery_status === 'delivered' ? '#10b98122' : 'transparent', 
                    border: `2px solid ${order.delivery_status === 'delivered' ? '#10b981' : 'var(--glass-border)'}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: order.delivery_status === 'delivered' ? '#10b981' : 'var(--text-secondary)' 
                  }}>
                    <Package size={20} />
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: 0, color: order.delivery_status === 'delivered' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Delivered</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {order.delivery_status === 'delivered' ? 'Package successfully delivered.' : 'Estimated delivery soon.'}
                  </p>
                </div>
              </div>
            </div>

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
