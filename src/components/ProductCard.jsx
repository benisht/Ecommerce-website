import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { isWishlisted, toggleWishlist } from '../data/wishlistManager';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(() =>
    product ? isWishlisted(product.id) : false
  );

  // Keep in sync if wishlist changes from another card
  // Must be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!product) return;
    const sync = () => setIsFavorite(isWishlisted(product.id));
    window.addEventListener('wishlistUpdated', sync);
    return () => window.removeEventListener('wishlistUpdated', sync);
  }, [product?.id]);

  if (!product) return null;

  const price = Number(product.price);
  const discountedPrice = product.discount_percent > 0
    ? price * (1 - product.discount_percent / 100)
    : price;

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleWishlist(product.id);
    setIsFavorite(newState);
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="product-card">
      <div className="product-card-top">
        {/* Badge: Best Seller if featured, else showing category */}
        <span className="product-card-badge">
          {product.featured ? 'Best Seller' : product.category}
        </span>

        {/* Favorite Heart Button */}
        <button
          className={`product-card-heart ${isFavorite ? 'active' : ''}`}
          onClick={handleHeartClick}
          aria-label="Add to Wishlist"
        >
          <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : '#6b7280'} />
        </button>

        {/* Product Image Link */}
        <Link to={`/products/${product.id}`} className="product-card-image-link">
          <img src={product.image} alt={product.name} className="product-card-image" />
        </Link>
      </div>

      <div className="product-card-bottom">
        <span className="product-card-brand">{product.category}</span>
        <Link to={`/products/${product.id}`}>
          <h3 className="product-card-title">{product.name}</h3>
        </Link>

        <div className="product-card-price-row">
          {product.discount_percent > 0 ? (
            <div className="product-card-price-container">
              <span className="product-card-price discounted">₹{discountedPrice.toFixed(2)}</span>
              <span className="product-card-price-original">₹{price.toFixed(2)}</span>
            </div>
          ) : (
            <span className="product-card-price">₹{price.toFixed(2)}</span>
          )}
        </div>

        <button className="product-card-button" onClick={handleBuyNow}>
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
