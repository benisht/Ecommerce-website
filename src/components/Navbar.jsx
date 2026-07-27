// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCartCount } from '../data/cartManager';
import { getWishlistCount } from '../data/wishlistManager';
import { fetchProducts } from '../data/apiService';
import { ShoppingCart, Menu, X, Search, Heart, Sun, Moon } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('lookwalk_theme') || 'dark');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lookwalk_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };


  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Load products for search
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProducts();
        setAllProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Navbar failed to load products:', err);
      }
    };
    load();
    window.addEventListener('productsUpdated', load);
    return () => window.removeEventListener('productsUpdated', load);
  }, []);

  useEffect(() => {
    const handleCartUpdate = () => setCartCount(getCartCount());
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    const handleWishlistUpdate = () => setWishlistCount(getWishlistCount());
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change safely
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setSearchOpen(false);
      setSearchQuery('');
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleResultClick = (id) => {
    navigate(`/products/${id}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Derive search results synchronously during render (React-recommended pattern)
  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? (allProducts || []).filter(
        p =>
          (p.name?.toLowerCase() || '').includes(q) ||
          (p.category?.toLowerCase() || '').includes(q) ||
          (p.description?.toLowerCase() || '').includes(q)
      ).slice(0, 6)
    : [];

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Wishlist', path: '/wishlist' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className={`navbar-container ${(isScrolled || location.pathname !== '/') ? 'scrolled glass-panel' : ''} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar container">
        <Link to="/" className="brand title-glow">
          LOOKWALK
        </Link>

        {/* Desktop Nav */}
        <nav className="desktop-nav">
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link to={link.path} className={location.pathname === link.path ? 'active' : ''}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-actions">
          {/* Search */}
          <div className="search-wrapper" ref={searchContainerRef}>
            <form
              className={`search-form ${searchOpen ? 'open' : ''}`}
              onSubmit={handleSearchSubmit}
            >
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
            </form>

            <button
              className="icon-btn search-toggle-btn"
              aria-label="Toggle Search"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                if (searchOpen) {
                  setSearchQuery('');
                }
              }}
            >
              {searchOpen ? <X size={22} /> : <Search size={22} />}
            </button>

            {/* Dropdown Results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    className="search-result-item"
                    onClick={() => handleResultClick(product.id)}
                    type="button"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="search-result-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="search-result-info">
                      <span className="search-result-name">{product.name}</span>
                      <span className="search-result-category">{product.category}</span>
                    </div>
                    <span className="search-result-price">₹{Number(product.price).toFixed(2)}</span>
                  </button>
                ))}
                {searchQuery.trim() && (
                  <button
                    className="search-view-all"
                    type="button"
                    onClick={handleSearchSubmit}
                  >
                    View all results for "{searchQuery}"
                  </button>
                )}
              </div>
            )}

            {/* No results message */}
            {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
              <div className="search-dropdown">
                <p className="search-no-results">No products found for "{searchQuery}"</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="icon-btn theme-toggle-btn"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          </button>

          <Link to="/wishlist" className="icon-btn wishlist-btn" aria-label="Wishlist">
            <Heart size={22} fill={wishlistCount > 0 ? '#ef4444' : 'none'} stroke={wishlistCount > 0 ? '#ef4444' : 'currentColor'} />
            {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </Link>

          <Link to="/checkout" className="icon-btn cart-btn" aria-label="Cart">
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <button
            className="icon-btn mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          {navLinks.map((link) => (
            <li key={link.name}>
              <Link
                to={link.path}
                className={location.pathname === link.path ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mobile-nav-actions">
          <Link to="/wishlist" className="icon-btn wishlist-btn" aria-label="Wishlist" onClick={() => setIsMobileMenuOpen(false)}>
            <Heart size={22} fill={wishlistCount > 0 ? '#ef4444' : 'none'} stroke={wishlistCount > 0 ? '#ef4444' : 'currentColor'} />
            {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/checkout" className="icon-btn cart-btn" aria-label="Cart" onClick={() => setIsMobileMenuOpen(false)}>
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
        {/* Mobile Search */}
        <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="futuristic-input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem', width: '100%' }}>
            Search
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
