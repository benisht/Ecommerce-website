import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts, fetchSettings } from '../data/apiService';
import { setSEOTags } from '../utils/seo';
import './Home.css';

const Home = () => {
  const [heroBg, setHeroBg] = useState('/hero-bg.png');
  const [ethosImg, setEthosImg] = useState('/hero-bg.png');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);

  // Autoplay slider logic
  useEffect(() => {
    if (discountedProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev === discountedProducts.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [discountedProducts]);

  useEffect(() => {
    // Set Home SEO Tags
    setSEOTags(
      'Home',
      'LOOKWALK - Trending cutting-edge streetwear, hoodies, watches, glasses and modern fashion apparel. High quality items delivered across India.'
    );

    const loadFeatured = async () => {
      try {
        const products = await fetchProducts();
        if (Array.isArray(products)) {
          setFeaturedProducts(products.slice(0, 4));
          const discounted = products.filter(p => p.discount_percent > 0);
          setDiscountedProducts(discounted);
        } else {
          console.error('Expected array of products, got:', products);
          setFeaturedProducts([]);
          setDiscountedProducts([]);
        }
      } catch (err) {
        console.error('Failed to load featured products:', err);
      }
    };
    
    const loadDBSettings = async () => {
      try {
        const h = await fetchSettings('lookwalk_hero_bg');
        if (h) setHeroBg(h);
        const e = await fetchSettings('lookwalk_ethos_img');
        if (e) setEthosImg(e);
        // const b = await fetchSettings('home_banner');
        // if (b) setBanner(b);
      } catch (err) { 
        console.error('Failed to load settings:', err); 
      }
    };

    loadFeatured();
    loadDBSettings();
  }, []);

  return (
    <div className="page-wrapper home-page">
      {/* Hero Section */}
      <section className="hero-section" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <h1 className="hero-title animate-fade-in-up">
            THE FUTURE OF <br />
            <span className="title-glow text-accent">STREETWEAR</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            “Dress like you’re already famous.”
          </p>
          <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/products" className="btn-primary">Shop Collection</Link>
            <Link to="/about" className="btn-secondary">Discover Lookwalk</Link>
          </div>
        </div>
      </section>

      {/* Dynamic Offers Slider Section */}
      {discountedProducts.length > 0 && (
  
    <div className="promo-slider-container">
      {discountedProducts.map((product, idx) => (
        <Link
          key={product.id}
          to={`/products/${product.id}`}
          className={`promo-slide ${idx === activeSlide ? 'active' : ''}`}
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(17, 24, 39, 0.95) 0%, rgba(17, 24, 39, 0.6) 50%, rgba(17, 24, 39, 0.2) 100%), url(${product.image})`,
          }}
        >
          <div className="promo-slide-content">
            <span className="promo-slide-badge animate-pulse">
              -{product.discount_percent}% OFF SPECIAL DEAL
            </span>
            <h2 className="promo-slide-title">{product.name}</h2>
            <div className="promo-slide-price">
              <span className="discounted-price-glowing">
                ₹{(Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)}
              </span>
              <span className="original-price-crossed">
                ₹{Number(product.price).toFixed(2)}
              </span>
            </div>
            <button className="btn-primary btn-small promo-slide-cta">
              Shop Now &rarr;
            </button>
          </div>
        </Link>
      ))}
      {/* Slider controls (only if more than 1 discounted product) */}
      {discountedProducts.length > 1 && (
        <>
          <button
            className="slider-arrow prev-arrow"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveSlide(prev => (prev === 0 ? discountedProducts.length - 1 : prev - 1));
            }}
          >
            &#10094;
          </button>
          <button
            className="slider-arrow next-arrow"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveSlide(prev => (prev === discountedProducts.length - 1 ? 0 : prev + 1));
            }}
          >
            &#10095;
          </button>
          <div className="slider-dots">
            {discountedProducts.map((_, idx) => (
              <button
                key={idx}
                className={`slider-dot ${idx === activeSlide ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveSlide(idx);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
)}

      {/* Featured Products */}
      <section className="featured-section container">
        <div className="section-header">
          <h2 className="section-title">TRENDING <span className="text-accent">NOW</span></h2>
          <Link to="/products" className="view-all-link">View All Products &rarr;</Link>
        </div>

        <div className="products-grid">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      
      {/* Brand Ethos */}
      <section className="ethos-section glass-panel">
        <div className="container ethos-content">
          <div className="ethos-text">
            <h2 className="title-glow">What makes us different</h2>
            <p>
              Tucked in the coastal charm of Manakudy, our fashion store is more than just a shop—it’s a friendly neighborhood space where style feels personal and every customer is valued. Inspired by the spirit of Kanyakumari, we offer carefully curated collections that blend comfort, trend, and individuality. We ship across India, and for those nearby, enjoy priority one-day delivery within a 30 km radius—bringing your favorite styles to your doorstep, fast and effortlessly.
            </p>
            <Link to="/about" className="btn-secondary" style={{ marginTop: '1rem' }}>Read Our Story</Link>
          </div>
          <div className="ethos-image-container">
            <img src={ethosImg} alt="Techwear Fashion" className="ethos-image" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
