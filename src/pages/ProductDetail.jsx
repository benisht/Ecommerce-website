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
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [selectedStock, setSelectedStock] = useState(0);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const data = await fetchProductById(id);
        setProduct(data);
        setActiveImage(data.image); // Set default active main image
        
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

  // Inject Structured Schema Markup for SEO
  useEffect(() => {
    if (!product) return;
    
    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": product.image,
      "description": product.description,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": product.discount_percent > 0 
          ? (Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)
          : Number(product.price).toFixed(2),
        "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'jsonld-product';
    script.innerHTML = JSON.stringify(schema);
    document.head.appendChild(script);
    
    return () => {
      const el = document.getElementById('jsonld-product');
      if (el) el.remove();
    };
  }, [product]);

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
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="product-detail-layout">
        {/* Left Side: Product Image & Gallery */}
        <div className="product-detail-image-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <img src={activeImage} alt={product.name} className="product-detail-image" loading="lazy" />
          
          {/* Thumbnail Gallery Strip */}
          {((product.images && product.images.length > 0) || product.image) && (
            <div className="thumbnail-strip" style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', overflowX: 'auto', padding: '0.5rem 0' }}>
              <img 
                src={product.image} 
                alt="Main" 
                style={{ 
                  width: '55px', 
                  height: '55px', 
                  objectFit: 'cover', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  border: (activeImage === product.image) ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                  opacity: (activeImage === product.image) ? 1 : 0.5 
                }}
                onClick={() => setActiveImage(product.image)}
                loading="lazy"
              />
              {product.images?.map((img, i) => (
                <img 
                  key={i}
                  src={img} 
                  alt={`Extra ${i+1}`} 
                  style={{ 
                    width: '55px', 
                    height: '55px', 
                    objectFit: 'cover', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    border: (activeImage === img) ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                    opacity: (activeImage === img) ? 1 : 0.5 
                  }}
                  onClick={() => setActiveImage(img)}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="product-detail-info">
          <div className="detail-header">
            <span className="detail-category">{product.category}</span>
            <h1 className="detail-title title-glow">{product.name}</h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.5rem' }}>
              {product.discount_percent > 0 ? (
                <>
                  <p className="detail-price">₹{(Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)}</p>
                  <p className="original-price" style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>₹{Number(product.price).toFixed(2)}</p>
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
                        // Swap active image to variant image if available
                        if (v.image) {
                          setActiveImage(v.image);
                        }
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
