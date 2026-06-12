import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { getWishlistIds } from '../data/wishlistManager';
import { fetchProducts } from '../data/apiService';
import ProductCard from '../components/ProductCard';
import './Wishlist.css';

const Wishlist = () => {
  const [likedProducts, setLikedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const ids = getWishlistIds();
      if (ids.length === 0) {
        setLikedProducts([]);
        return;
      }
      const allProducts = await fetchProducts();
      if (Array.isArray(allProducts)) {
        const wishlistedSet = new Set(ids.map(String));
        const filtered = allProducts.filter(p => wishlistedSet.has(String(p.id)));
        setLikedProducts(filtered);
      }
    } catch (err) {
      console.error('Failed to load wishlist products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  // Re-load when wishlist changes (items removed from cards on this page)
  useEffect(() => {
    const handleUpdate = () => loadWishlist();
    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleUpdate);
  }, []);

  return (
    <div className="page-wrapper wishlist-page animate-fade-in-up">
      {/* Hero Header */}
      <div className="wishlist-hero">
        <div className="wishlist-hero-icon">
          <Heart size={36} fill="#ef4444" stroke="#ef4444" />
        </div>
        <h1 className="wishlist-title">
          MY <span className="text-accent">WISHLIST</span>
        </h1>
        <p className="wishlist-subtitle">
          {loading
            ? 'Loading your favourites...'
            : likedProducts.length > 0
            ? `You have ${likedProducts.length} item${likedProducts.length !== 1 ? 's' : ''} saved`
            : 'Your wishlist is empty'}
        </p>
      </div>

      <div className="container">
        {loading ? (
          <div className="wishlist-loading">
            <div className="wishlist-spinner"></div>
            <p>Fetching your liked products…</p>
          </div>
        ) : likedProducts.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              <Heart size={64} stroke="#cbd5e1" fill="none" />
            </div>
            <h2>Nothing liked yet</h2>
            <p>Tap the heart icon on any product to save it here.</p>
            <Link to="/products" className="btn-primary wishlist-shop-btn">
              <ShoppingBag size={18} style={{ marginRight: 8 }} />
              Explore Collection
            </Link>
          </div>
        ) : (
          <>
            <div className="wishlist-grid">
              {likedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="wishlist-footer">
              <Link to="/products" className="btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
