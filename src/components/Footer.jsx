import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin } from 'lucide-react';
import './Footer.css';

const MAPS_URL = 'https://maps.app.goo.gl/rV9tzB6bJPdQ22bC9';
const MAPS_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3946.071850117496!2d77.47271457497139!3d8.483161691563264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b04f1412d287687%3A0x6b406e40d4a9cc1b!2sManakudy%2C%20Tamil%20Nadu%20629602!5e0!3m2!1sen!2sin!4v1718790000000!5m2!1sen!2sin';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="container footer-content">
        <div className="footer-brand">
          <h2 className="title-glow">LOOKWALK</h2>
          <p className="footer-description">
            Futuristic apparel for the modern world. Trending design meets cutting-edge fashion.
          </p>

          {/* Mini Map */}
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-mini-map"
            aria-label="Open shop location on Google Maps"
          >
            <iframe
              src={MAPS_EMBED}
              width="100%"
              height="130"
              style={{ border: 0, display: 'block', pointerEvents: 'none' }}
              loading="lazy"
              title="LOOKWALK Shop Location"
            />
            <div className="footer-mini-map-label">
              <MapPin size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              Open in Google Maps
            </div>
          </a>
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
            </ul>
          </div>

          <div className="link-group">
            <h3>Social</h3>
            <ul>
              <li><a href="https://www.instagram.com/look.walk.in" target="_blank" rel="noreferrer">Instagram</a></li>
            </ul>
            {/* Contact Number */}
            <div className="footer-contact-block">
              <h3>Contact</h3>
              <a href="tel:+919443446921" className="footer-phone-link">
                <Phone size={15} />
                +91 94434 46921
              </a>
            </div>
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
