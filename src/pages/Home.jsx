import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts } from '../data/apiService';
import './Home.css';

const Home = () => {
  const [heroBg, setHeroBg] = useState('/hero-bg.png');
  const [ethosImg, setEthosImg] = useState('/hero-bg.png');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [banner, setBanner] = useState({ image: '', text: '', active: false });
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const products = await fetchProducts();
        if (Array.isArray(products)) {
          setFeaturedProducts(products.slice(0, 4));
        } else {
          console.error('Expected array of products, got:', products);
          setFeaturedProducts([]);
        }
      } catch (err) {
        console.error('Failed to load featured products:', err);
      }
    };
    
    const loadImages = () => {
      const savedHero = localStorage.getItem('lookwalk_hero_bg');
      if (savedHero) setHeroBg(savedHero);
      const savedEthos = localStorage.getItem('lookwalk_ethos_img');
      if (savedEthos) setEthosImg(savedEthos);
    };

    const loadExtra = async () => {
      try {
        const fetchSettings = (await import('../data/apiService')).fetchSettings;
        const b = await fetchSettings('home_banner');
        if (b) setBanner(b);
      } catch (err) { console.error('Failed to load banner:', err); }
    };

    loadFeatured();
    loadImages();
    loadExtra();
    window.addEventListener('appearanceUpdated', loadImages);
    return () => window.removeEventListener('appearanceUpdated', loadImages);
  }, []);

  return (
    <div className="page-wrapper home-page">
      {/* Dynamic News/Sale Banner */}
      {banner.active && (
        <div className="news-banner glass-panel" style={{ 
          margin: '1.5rem 2rem 0',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderRadius: '12px',
          border: '2px solid #ff3b30',
          boxShadow: '0 0 30px rgba(255, 59, 48, 0.4)',
          zIndex: 9999,
          position: 'relative',
          height: '60px'
        }}>
          {banner.image && (
            <div className="banner-image" style={{ 
              width: '100px', 
              height: '100%', 
              flexShrink: 0,
              background: `url(${banner.image}) center/cover`
            }}></div>
          )}
          <div className="banner-text" style={{ 
            padding: '0 1.5rem', 
            flex: 1, 
            fontSize: '1rem', 
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--text-primary)'
          }}>
            <marquee behavior="scroll" direction="left" scrollamount="6">
              {banner.text}
            </marquee>
          </div>
        </div>
      )}

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
            <img src={ethosImg} alt="Techwear Fashion" className="ethos-image" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
