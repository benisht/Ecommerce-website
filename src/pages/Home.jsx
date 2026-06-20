import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts, fetchSettings, fetchCategories } from '../data/apiService';
import { setSEOTags } from '../utils/seo';
import './Home.css';

const Home = () => {
  // Layout / UI state
  const [heroBg, setHeroBg] = useState('/hero-bg.png');
  const [ethosImg, setEthosImg] = useState('/hero-bg.png');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [categoryData, setCategoryData] = useState([]); // [{name, image}]




  // Category scroll ref
  const catTrackRef = useRef(null);
  const scrollCats = (dir) => {
    if (!catTrackRef.current) return;
    const scrollAmount = catTrackRef.current.offsetWidth * 0.8;
    catTrackRef.current.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  // Autoplay slider for discounted products
  useEffect(() => {
    if (discountedProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev === discountedProducts.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [discountedProducts]);

  // Initial data load
  useEffect(() => {
    setSEOTags(
      'Home',
      'LOOKWALK - Trending cutting-edge streetwear, hoodies, watches, glasses and modern fashion apparel. High quality items delivered across India.'
    );

    const loadAll = async () => {
      try {
        const products = await fetchProducts();
        if (Array.isArray(products)) {
          const sorted = [...products].sort((a, b) => {
            if (a.in_stock && !b.in_stock) return -1;
            if (!a.in_stock && b.in_stock) return 1;
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.id - a.id;
          });
          setFeaturedProducts(sorted.slice(0, 10));
          setDiscountedProducts(products.filter((p) => p.discount_percent > 0));

          // Build category image map (prioritizing featured products so the user can choose category images)
          const catMap = {};
          const sortedForCategories = [...products].sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
          });
          sortedForCategories.forEach((p) => {
            if (p.category && !catMap[p.category]) {
              catMap[p.category] = p.image;
            }
          });
          setCategoryData(Object.entries(catMap).map(([name, image]) => ({ name, image })));
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }

      try {
        const hero = await fetchSettings('lookwalk_hero_bg');
        if (hero) setHeroBg(hero);
        const ethos = await fetchSettings('lookwalk_ethos_img');
        if (ethos) setEthosImg(ethos);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadAll();
  }, []);



  return (
    <div className="page-wrapper home-page">
      {/* HERO */}
      <section className="hero-section" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title animate-fade-in-up">
            THE FUTURE OF <br />
            <span className="title-glow text-accent">STREETWEAR</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            "Dress like you're already famous."
          </p>
          <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/products" className="btn-primary" id="hero-shop-btn">
              Shop Collection
            </Link>
            <Link to="/about" className="btn-secondary" id="hero-discover-btn">
              Discover Lookwalk
            </Link>
          </div>
        </div>
      </section>

      {/* DISCOUNTED PRODUCTS SLIDER */}
      {discountedProducts.length > 0 && (
        <div className="promo-slider-container">
          {discountedProducts.map((product, idx) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className={`promo-slide ${idx === activeSlide ? 'active' : ''}`}
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.6) 50%, rgba(17,24,39,0.2) 100%), url(${product.image})`,
              }}
            >
              <div className="promo-slide-content">
                <span className="promo-slide-badge animate-pulse">-{product.discount_percent}% OFF SPECIAL DEAL</span>
                <h2 className="promo-slide-title">{product.name}</h2>
                <div className="promo-slide-price">
                  <span className="discounted-price-glowing">
                    ₹{(Number(product.price) * (1 - product.discount_percent / 100)).toFixed(2)}
                  </span>
                  <span className="original-price-crossed">₹{Number(product.price).toFixed(2)}</span>
                </div>
                <button className="btn-primary btn-small promo-slide-cta">Shop Now &rarr;</button>
              </div>
            </Link>
          ))}
          {discountedProducts.length > 1 && (
            <>
              <button
                className="slider-arrow prev-arrow"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveSlide((p) => (p === 0 ? discountedProducts.length - 1 : p - 1));
                }}
              >
                &#10094;
              </button>
              <button
                className="slider-arrow next-arrow"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveSlide((p) => (p === discountedProducts.length - 1 ? 0 : p + 1));
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

      {/* CATEGORIES */}
      {categoryData.length > 0 && (
        <section className="categories-section">
          <div className="section-header">
            <h2 className="section-title">
              SHOP BY <span className="text-accent">CATEGORY</span>
            </h2>
            <Link to="/products" className="view-all-link">
              All Products &rarr;
            </Link>
          </div>
          <div className="categories-slider-wrapper">
            <button className="cat-arrow left" onClick={() => scrollCats(-1)} aria-label="Scroll categories left">
              &#8249;
            </button>
            <div className="categories-track" ref={catTrackRef}>
              {categoryData.map(({ name, image }) => (
                <Link
                  key={name}
                  to={`/products?category=${encodeURIComponent(name)}`}
                  className="category-card"
                  aria-label={`Shop ${name}`}
                >
                  {image ? (
                    <img src={image} alt={name} className="category-card-img" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="category-placeholder-icon">👕</div>
                  )}
                  <div className="category-card-overlay">
                    <span className="category-card-name">{name}</span>
                  </div>
                </Link>
              ))}
            </div>
            <button className="cat-arrow right" onClick={() => scrollCats(1)} aria-label="Scroll categories right">
              &#8250;
            </button>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="featured-section container">
        <div className="section-header">
          <h2 className="section-title">
            TOP <span className="text-accent">SELLERS</span>
          </h2>
          <Link to="/products" className="view-all-link">
            View All Products &rarr;
          </Link>
        </div>
        <div className="products-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>



      {/* BRAND ETHOS */}
      <section className="ethos-section glass-panel">
        <div className="container ethos-content">
          <div className="ethos-text">
            <h2 className="title-glow">What makes us different</h2>
            <p>
              Tucked in the coastal charm of Manakudy, our fashion store is more than just a shop—it's a friendly neighborhood space where style feels personal and every customer is valued. Inspired by the spirit of Kanyakumari, we offer carefully curated collections that blend comfort, trend, and individuality. We ship across India, and for those nearby, enjoy priority one-day delivery within a 30 km radius—bringing your favorite styles to your doorstep, fast and effortlessly.
            </p>
            <Link to="/about" className="btn-secondary" style={{ marginTop: '1rem' }}>
              Read Our Story
            </Link>
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
