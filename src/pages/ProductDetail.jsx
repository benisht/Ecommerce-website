// src/pages/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, ShieldCheck, Zap, Package, Loader } from 'lucide-react';
import { fetchProductById } from '../data/apiService';
import { addToCart } from '../data/cartManager';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  console.info('ProductDetail ID:', id);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [selectedStock, setSelectedStock] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const data = await fetchProductById(id);
        setProduct(data);
        // Default selection
        if (data.sizes && data.sizes.length > 0) setSize(data.sizes[0]);
        else setSize('Standard');
        
        if (data.variants && data.variants.length > 0) {
          setColor(data.variants[0].color);
          const firstVariant = data.variants[0];
          const initialSize = data.sizes?.[0] || 'Standard';
          if (typeof firstVariant.stock === 'object' && firstVariant.stock !== null) {
            setSelectedStock(firstVariant.stock[initialSize] || 0);
          } else {
            setSelectedStock(firstVariant.stock || 0);
          }
        }
      } catch (err) {
        console.error('Error loading product:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrapper container flex-center" style={{ minHeight: '60vh' }}>
        <Loader size={40} className="spin text-accent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-wrapper container" style={{ textAlign: 'center', paddingTop: '10rem' }}>
        <h2>Product not found.</h2>
        <Link to="/products" className="btn-primary" style={{ marginTop: '2rem' }}>Back to Products</Link>
      </div>
    );
  }

  const productSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['Standard'];
  const productVariants = product.variants && product.variants.length > 0 ? product.variants : [];
  const displayImage = color && productVariants.find(v => v.color === color)?.image 
    ? productVariants.find(v => v.color === color).image 
    : product.image;

  const handleAddToCart = () => {
    if (product.in_stock === false || selectedStock <= 0) {
      alert('This item is currently out of stock.');
      return;
    }
    if (!size) {
      alert('Please select a size first.');
      return;
    }
    if (!color) {
      alert('Please select a color first.');
      return;
    }
    addToCart(product, size, color, 1);
    alert(`${product.name} added to cart!`);
  };

  return (
    <div className="page-wrapper container animate-fade-in-up">
      {console.info('Rendering ProductDetail:', product?.name)}
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="product-detail-layout">
        <div className="product-detail-image-container glass-panel">
          <img src={displayImage} alt={product.name} className="product-detail-image" />
        </div>

        <div className="product-detail-info">
          <div className="detail-header">
            <span className="detail-category">{product.category}</span>
            <h1 className="detail-title title-glow">{product.name}</h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.5rem' }}>
              {product.discount_percent > 0 ? (
                <>
                  <p className="detail-price" style={{ color: '#ff3b30' }}>₹{(Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)}</p>
                  <p className="original-price" style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>₹{Number(product.price).toFixed(2)}</p>
                  <span className="sale-badge" style={{ background: '#ff3b30', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>-{product.discount_percent}% OFF</span>
                </>
              ) : (
                <p className="detail-price">₹{Number(product.price).toFixed(2)}</p>
              )}
            </div>
          </div>

          <p className="detail-description">{product.description}</p>

          <div className="detail-options">
            <div className="size-selector">
              <h3>Select Size</h3>
              <div className="size-btns">
                {productSizes.map(s => (
                  <button
                    key={s}
                    className={`size-btn ${size === s ? 'active' : ''}`}
                    onClick={() => {
                      setSize(s);
                      const currentVariant = productVariants.find(v => v.color === color);
                      if (currentVariant) {
                        const sStock = typeof currentVariant.stock === 'object' ? (currentVariant.stock[s] || 0) : (currentVariant.stock || 0);
                        setSelectedStock(sStock);
                      }
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {productVariants.length > 0 && (
              <div className="size-selector" style={{ marginTop: '2rem' }}>
                <h3>Select Color</h3>
                <div className="size-btns" style={{ flexWrap: 'wrap' }}>
                  {productVariants.map(v => (
                    <button
                      key={v.color}
                      className={`size-btn ${color === v.color ? 'active' : ''}`}
                      style={{ width: 'auto', padding: '0 1rem', borderRadius: '20px' }}
                      onClick={() => {
                        setColor(v.color);
                        const sStock = typeof v.stock === 'object' ? (v.stock[size] || 0) : (v.stock || 0);
                        setSelectedStock(sStock);
                      }}
                    >
                      {v.color} {typeof v.stock === 'object' ? (v.stock[size] !== undefined && `(${v.stock[size]})`) : (v.stock !== undefined && `(${v.stock})`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn-primary add-to-cart-btn"
              style={{ marginTop: '2rem', opacity: (product.in_stock === false || selectedStock <= 0) ? 0.5 : 1, cursor: (product.in_stock === false || selectedStock <= 0) ? 'not-allowed' : 'pointer' }}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={20} />
              <span>{(product.in_stock === false || selectedStock <= 0) ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>
          </div>

          <div className="product-features">
            <div className="feature-item">
              <ShieldCheck className="feature-icon" />
              <span>1-day delivery for the distance radius of 30 km from the shop</span>
            </div>
            <div className="feature-item">
              <Zap className="feature-icon" />
              <span>100% Genuine and trendy Products</span>
            </div>
            <div className="feature-item">
              <Package className="feature-icon" />
              <span>Shipping charges will differ as per location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
