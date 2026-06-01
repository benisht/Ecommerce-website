import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import './ProductCard.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  if (!product) return null;

  return (
    <div className="product-card glass-panel">
      <Link to={`/products/${product.id}`} className="product-image-container">
        <img src={product.image} alt={product.name} className="product-image" />
        {product.discount_percent > 0 && (
          <div className="sale-badge">-{product.discount_percent}% OFF</div>
        )}
        <div className="product-overlay">
          <button className="btn-primary quick-view">Quick View</button>
        </div>
      </Link>
      
      <div className="product-info">
        <div className="product-header">
          <Link to={`/products/${product.id}`}>
            <h3 className="product-title">{product.name}</h3>
          </Link>
          <div className="price-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {product.discount_percent > 0 ? (
              <>
                <span className="product-price discounted-price">₹{(Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)}</span>
                <span className="original-price" style={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>₹{Number(product.price).toFixed(2)}</span>
              </>
            ) : (
              <span className="product-price">₹{Number(product.price).toFixed(2)}</span>
            )}
          </div>
        </div>
        
        <p className="product-category">{product.category}</p>
        
        <div className="product-actions">
          <button className="btn-secondary icon-btn-large" onClick={(e) => { e.preventDefault(); navigate(`/products/${product.id}`); }}>
            <ShoppingCart size={20} />
            <span>Select Options</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
