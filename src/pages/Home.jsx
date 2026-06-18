import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts, fetchSettings, fetchCategories } from '../data/apiService';
import { setSEOTags } from '../utils/seo';
import './Home.css';

/* ── helper: convert any Instagram reel/post URL → embed URL ───────── */
const toEmbedUrl = (url) => {
  if (!url) return null;
  const cleaned = url.trim().replace(/\/$/, '');
  // Already an embed URL
  if (cleaned.includes('/embed')) return cleaned;
  // Reel or post
  const match = cleaned.match(/instagram\.com\/(reel|p)\/([\w-]+)/);
  if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
  return null;
};

const Home = () => {
  const [heroBg, setHeroBg] = useState('/hero-bg.png');
  const [ethosImg, setEthosImg] = useState('/hero-bg.png');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);

  // Categories with representative product images
  const [categoryData, setCategoryData] = useState([]); // [{name, image}]

  // Instagram reels: array of URLs saved by admin
  const [reelLinks, setReelLinks] = useState([]);

  // Ref for category scroll track
  const catTrackRef = useRef(null);
  const scrollCats = (dir) => {
    if (!catTrackRef.current) return;
    const scrollAmount = catTrackRef.current.offsetWidth * 0.8;
    catTrackRef.current.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  // Autoplay slider logic
  useEffect(() => {
    if (discountedProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev === discountedProducts.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [discountedProducts]);

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
          setDiscountedProducts(products.filter(p => p.discount_percent > 0));

          // Build category map → pick one product image per category
          const catMap = {};
          products.forEach(p => {
            if (p.category && !catMap[p.category]) {
              catMap[p.category] = p.image;
            }
          });
          setCategoryData(Object.entries(catMap).map(([name, image]) => ({ name, image })));
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }

      // Load categories from server too (to include empty ones)
      try {
        const cats = await fetchCategories();
        // Merge server cats with product images already collected
        // (effect runs after setProducts so we rely on the product-based catMap above)
        // We only use this to ensure ordering consistency — no-op here
      } catch (_) {}

      try {
        const h = await fetchSettings('lookwalk_hero_bg');
        if (h) setHeroBg(h);
        const e = await fetchSettings('lookwalk_ethos_img');
        if (e) setEthosImg(e);
        const reels = await fetchSettings('lookwalk_ig_reels');
        if (Array.isArray(reels)) setReelLinks(reels);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadAll();
  }, []);

  return (
    <div className="page-wrapper home-page">
      {/* ── HERO ─────────────────────────────────────────────── */}
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
            <Link to="/products" className="btn-primary" id="hero-shop-btn">Shop Collection</Link>
            <Link to="/about" className="btn-secondary" id="hero-discover-btn">Discover Lookwalk</Link>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC OFFERS SLIDER ────────────────────────────── */}
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
                <button className="btn-primary btn-small promo-slide-cta">Shop Now &rarr;</button>
              </div>
            </Link>
          ))}
          {discountedProducts.length > 1 && (
            <>
              <button
                className="slider-arrow prev-arrow"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveSlide(p => (p === 0 ? discountedProducts.length - 1 : p - 1)); }}
              >&#10094;</button>
              <button
                className="slider-arrow next-arrow"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveSlide(p => (p === discountedProducts.length - 1 ? 0 : p + 1)); }}
              >&#10095;</button>
              <div className="slider-dots">
                {discountedProducts.map((_, idx) => (
                  <button
                    key={idx}
                    className={`slider-dot ${idx === activeSlide ? 'active' : ''}`}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveSlide(idx); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SHOP BY CATEGORY ─────────────────────────────────── */}
      {categoryData.length > 0 && (
        <section className="categories-section">
          <div className="section-header">
            <h2 className="section-title">SHOP BY <span className="text-accent">CATEGORY</span></h2>
            <Link to="/products" className="view-all-link">All Products &rarr;</Link>
          </div>

          <div className="categories-slider-wrapper">
            {/* Left arrow */}
            <button className="cat-arrow left" onClick={() => scrollCats(-1)} aria-label="Scroll categories left">&#8249;</button>

            {/* Horizontal scroll track */}
            <div className="categories-track" ref={catTrackRef}>
              {categoryData.map(({ name, image }) => (
                <Link
                  key={name}
                  to={`/products?category=${encodeURIComponent(name)}`}
                  className="category-card"
                  aria-label={`Shop ${name}`}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="category-card-img"
                      loading="lazy"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="category-placeholder-icon">👕</div>
                  )}
                  <div className="category-card-overlay">
                    <span className="category-card-name">{name}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Right arrow */}
            <button className="cat-arrow right" onClick={() => scrollCats(1)} aria-label="Scroll categories right">&#8250;</button>
          </div>
        </section>
      )}


      {/* ── FEATURED PRODUCTS ────────────────────────────────── */}
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

      {/* ── INSTAGRAM REELS ──────────────────────────────────── */}
      {reelLinks.length > 0 && (
        <section className="reels-section">
          <div className="reels-section-inner">
            <div className="section-header">
              <h2 className="section-title">AS SEEN ON <span className="text-accent">INSTAGRAM</span></h2>
              <div className="reels-label">
                <span className="reels-label-dot" />
                @lookwalk
              </div>
            </div>
            <div className="reels-grid">
              {reelLinks.map((url, idx) => {
                const embedUrl = toEmbedUrl(url);
                if (!embedUrl) return null;
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reel-card"
                    aria-label={`Watch reel ${idx + 1} on Instagram`}
                  >
                    <div className="reel-iframe-wrapper">
                      <iframe
                        src={embedUrl}
                        title={`Instagram Reel ${idx + 1}`}
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency="true"
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        loading="lazy"
                      />
                    </div>
                    <div className="reel-overlay">
                      <div className="reel-play-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <span className="reel-ig-badge">▶ REEL</span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── BRAND ETHOS ──────────────────────────────────────── */}
      <section className="ethos-section glass-panel">
        <div className="container ethos-content">
          <div className="ethos-text">
            <h2 className="title-glow">What makes us different</h2>
            <p>
              Tucked in the coastal charm of Manakudy, our fashion store is more than just a shop—it's a friendly neighborhood space where style feels personal and every customer is valued. Inspired by the spirit of Kanyakumari, we offer carefully curated collections that blend comfort, trend, and individuality. We ship across India, and for those nearby, enjoy priority one-day delivery within a 30 km radius—bringing your favorite styles to your doorstep, fast and effortlessly.
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
