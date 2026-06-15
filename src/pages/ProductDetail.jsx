// src/pages/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { fetchProductById } from '../data/apiService';
import { addToCart } from '../data/cartManager';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Custom states
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [selectedStock, setSelectedStock] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Accordion state
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Load product data
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
        "price": Number(product.price).toFixed(2),
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
        <button onClick={() => navigate('/products')} className="btn-primary" style={{ marginTop: '2rem' }}>Back to Products</button>
      </div>
    );
  }

  const productSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['Standard'];
  const productVariants = product.variants && product.variants.length > 0 ? product.variants : [];

  // Generate complete images list (main image + variants/extra images)
  const allImages = [product.image];
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach(img => {
      if (img && !allImages.includes(img)) allImages.push(img);
    });
  }
  productVariants.forEach(v => {
    if (v.image && !allImages.includes(v.image)) allImages.push(v.image);
  });

  const handlePrevImage = () => {
    setActiveImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

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
    const finalQty = Math.min(quantity, selectedStock);
    addToCart(product, size, color, finalQty, selectedStock);
    alert(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (product.in_stock === false || selectedStock <= 0) {
      alert('This item is currently out of stock.');
      return;
    }
    const finalQty = Math.min(quantity, selectedStock);
    addToCart(product, size, color, finalQty, selectedStock);
    navigate('/checkout');
  };

  const toggleAccordion = (section) => {
    setActiveAccordion(prev => (prev === section ? null : section));
  };

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="premium-detail-layout">
        {/* Left Side: Image Carousel Gallery */}
        <div className="premium-gallery-section">
          <div className="premium-main-image-wrapper">
            {allImages.length > 1 && (
              <button className="carousel-arrow prev-on-image" onClick={handlePrevImage} aria-label="Previous image">
                <ChevronLeft size={24} />
              </button>
            )}
            <img 
              src={allImages[activeImageIndex]} 
              alt={product.name} 
              className="premium-main-image" 
              loading="lazy" 
            />
            {allImages.length > 1 && (
              <button className="carousel-arrow next-on-image" onClick={handleNextImage} aria-label="Next image">
                <ChevronRight size={24} />
              </button>
            )}
          </div>
          
          {/* Thumbnail Gallery Strip */}
          {allImages.length > 1 && (
            <div className="premium-thumbnail-strip">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  className={`premium-thumb-btn ${idx === activeImageIndex ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="premium-thumb-img" />
                </button>
              ))}
            </div>
          )}

          {/* Carousel Pagination Controls */}
          {allImages.length > 1 && (
            <div className="premium-carousel-controls">
              <div className="carousel-numbers">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    className={`carousel-num-btn ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="premium-info-section">
          <div className="premium-header">
            <h1 className="premium-title">{product.name}</h1>
            <div className="premium-meta-row">
              <span className="premium-price">₹{Number(product.price).toFixed(2)}</span>
              <span className="premium-category-label">{product.category}</span>
            </div>
          </div>

          <p className="premium-description">{product.description}</p>

          <div className="premium-options">
            {/* COLOR SELECTOR */}
            {productVariants.length > 0 && (
              <div className="premium-option-group">
                <h3 className="option-label">COLOR</h3>
                <div className="option-grid">
                  {productVariants.map(v => (
                    <button
                      key={v.color}
                      className={`option-box-btn ${color === v.color ? 'active' : ''}`}
                      onClick={() => {
                        setColor(v.color);
                        if (v.image) {
                          const imgIndex = allImages.indexOf(v.image);
                          if (imgIndex !== -1) setActiveImageIndex(imgIndex);
                        }
                        const sStock = typeof v.stock === 'object' ? (v.stock[size] || 0) : (v.stock || 0);
                        setSelectedStock(sStock);
                      }}
                    >
                      {v.color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SIZE SELECTOR */}
            <div className="premium-option-group" style={{ marginTop: '1.5rem' }}>
              <h3 className="option-label">SIZE</h3>
              <div className="option-grid">
                {productSizes.map(s => (
                  <button
                    key={s}
                    className={`option-box-btn ${size === s ? 'active' : ''}`}
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

            {/* QUANTITY SELECTOR */}
            <div className="premium-option-group" style={{ marginTop: '1.5rem' }}>
              <h3 className="option-label">QUANTITY</h3>
              <div className="qty-control-row">
                <div className="qty-counter">
                  <button 
                    type="button" 
                    className="qty-btn"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button 
                    type="button" 
                    className="qty-btn"
                    onClick={() => setQuantity(prev => Math.min(selectedStock || 10, prev + 1))}
                  >
                    +
                  </button>
                </div>
                {selectedStock > 0 ? (
                  <span className="stock-indicator in-stock">In Stock ({selectedStock} available)</span>
                ) : (
                  <span className="stock-indicator out-of-stock">Out of Stock</span>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="premium-action-buttons">
              <button 
                className="premium-action-btn primary"
                disabled={product.in_stock === false || selectedStock <= 0}
                onClick={handleAddToCart}
              >
                <span>ADD TO CART</span>
                <Play size={14} className="btn-arrow-icon" />
              </button>

              <button 
                className="premium-action-btn secondary"
                disabled={product.in_stock === false || selectedStock <= 0}
                onClick={handleBuyNow}
              >
                <span>BUY NOW</span>
                <Play size={14} className="btn-arrow-icon" />
              </button>
            </div>
          </div>

          {/* ACCORDION INFO PANELS */}
          <div className="premium-accordions">
            {/* ACCORDION 1: SHIPPING */}
            <div className={`accordion-item ${activeAccordion === 'shipping' ? 'open' : ''}`}>
              <button className="accordion-trigger" onClick={() => toggleAccordion('shipping')}>
                <span>SHIPPING DETAILS</span>
                <Play size={12} className="accordion-arrow" />
              </button>
              <div className="accordion-content">
                <p>
                  Enjoy prompt shipping across India. We offer priority one-day delivery within a 30 km radius of our store location in Manakudy, Kanyakumari. Shipping charges are calculated dynamically based on your delivery address pin code during checkout.
                </p>
              </div>
            </div>

            {/* ACCORDION 2: RETURNS */}
            <div className={`accordion-item ${activeAccordion === 'returns' ? 'open' : ''}`}>
              <button className="accordion-trigger" onClick={() => toggleAccordion('returns')}>
                <span>RETURNS & EXCHANGES</span>
                <Play size={12} className="accordion-arrow" />
              </button>
              <div className="accordion-content">
                <p>
                  We accept returns and sizing exchanges within 7 days of order receipt. Items must be returned in their original packaging, unworn, unwashed, and with all product tags fully intact. Sizing exchanges are free of charge.
                </p>
              </div>
            </div>

            {/* ACCORDION 3: CARE & SPECS */}
            <div className={`accordion-item ${activeAccordion === 'specs' ? 'open' : ''}`}>
              <button className="accordion-trigger" onClick={() => toggleAccordion('specs')}>
                <span>CARE & MATERIALS</span>
                <Play size={12} className="accordion-arrow" />
              </button>
              <div className="accordion-content">
                <p>
                  Crafted using high-quality premium fabrics and materials designed for maximum daily durability. Heavyweight cotton blends. Machine wash cold with similar colors. Hang dry or tumble dry low. Do not bleach.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
