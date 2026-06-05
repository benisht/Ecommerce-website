import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="container footer-content">
        <div className="footer-brand">
          <h2 className="title-glow">LOOKWALK</h2>
          <p className="footer-description">
            Futuristic apparel for the modern world. Trending design meets cutting-edge fashion.
          </p>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h3>Shop</h3>
            <ul>
              <li><Link to="/products">All Products</Link></li>
            </ul>
          </div>

          <div className="link-group">
            <h3>Company</h3>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/track-order">Track Order</Link></li>
              <li><Link to="/admin">Admin Dashboard</Link></li>
            </ul>
          </div>

          <div className="link-group">
            <h3>Social</h3>
            <ul>
              <li><a href="https://www.instagram.com/look.walk.in" target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href="#" target="_blank" rel="noreferrer"></a></li>
              <li><a href="#" target="_blank" rel="noreferrer"></a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} LOOKWALK. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
