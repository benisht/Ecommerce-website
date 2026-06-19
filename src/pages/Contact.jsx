import React, { useState } from 'react';
import { Mail, MapPin, Phone, CheckCircle } from 'lucide-react';
import { submitContactQuery } from '../data/apiService';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await submitContactQuery(formData);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setIsSubmitted(false), 6000);
    } catch (err) {
      alert('Failed to send message. Please check your internet connection and try again.');
      console.error('Submit query error:', err);
    }
    setIsLoading(false);
  };

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <div className="contact-header">
        <h1 className="title-glow">Contact Us</h1>
        <p className="contact-subtitle">Establish a connection with our operations team.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-info glass-panel">
          <h2>Contact Info</h2>

          <div className="info-block">
            <MapPin className="text-accent" size={24} />
            <div>
              <h3>Location</h3>
              <p>3FVM+6FH, Manakudy, Tamil Nadu 629602<br />Kanyakumari, Tamil Nadu 629602</p>
            </div>
          </div>

          <div className="map-container" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <iframe 
              src="https://maps.app.goo.gl/Jc1tN8PFonFuk3vr6" 
              width="100%" 
              height="250" 
              style={{ border: 0, borderRadius: '8px' }} 
              allowFullScreen="" 
              loading="lazy"
              title="Location Map"
            ></iframe>
          </div>

          <div className="info-block">
            <Mail className="text-accent" size={24} />
            <div>
              <h3>Email Communication</h3>
              <p>lookwalkclothing@gmail.com</p>
            </div>
          </div>

          <div className="info-block">
            <Phone className="text-accent" size={24} />
            <div>
              <h3>Voice Communication</h3>
              <p>+91 9443446921</p>
            </div>
          </div>
        </div>

        <div className="contact-form-container glass-panel">
          {isSubmitted ? (
            <div className="success-message">
              <CheckCircle size={48} className="text-accent" style={{ marginBottom: '1rem' }} />
              <h2 className="title-glow text-accent">Message Received!</h2>
              <p>Our team will get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">NAME</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="futuristic-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">EMAIL ID</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="futuristic-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">PHONE NUMBER</label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="futuristic-input"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">MESSAGE TO US</label>
                <textarea
                  id="message"
                  rows="5"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="futuristic-input"
                ></textarea>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'SEND MESSAGE'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
