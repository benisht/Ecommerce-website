import React, { useState, useEffect } from 'react';
import { fetchSettings } from '../data/apiService';
import { setSEOTags } from '../utils/seo';
import './About.css';

const About = () => {
  const [about1, setAbout1] = useState('/hero-bg.png');
  const [about2, setAbout2] = useState('/hero-bg.png');

  useEffect(() => {
    // Set About Page SEO Tags
    setSEOTags(
      'Our Story',
      'About LOOKWALK - Founded by Johnson and Nancy in 2026. A neighborhood shop where personal style meets comfort, trust, and premium fashion.'
    );

    const loadImagesFromDB = async () => {
      try {
        const a1 = await fetchSettings('lookwalk_about_img_1');
        if (a1) setAbout1(a1);
        const a2 = await fetchSettings('lookwalk_about_img_2');
        if (a2) setAbout2(a2);
      } catch (err) {
        console.error('Failed to load about settings:', err);
      }
    };

    loadImagesFromDB();
  }, []);

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <div className="about-header">
        <h1 className="title-glow">OUR <span className="text-accent">STORY</span></h1>
        <p className="about-subtitle">Where personal style meets comfort, crafted for everyday life.</p>
      </div>

      <div className="about-content">
        <div className="about-image-grid">
          <img src={about1} alt="Futuristic Studio" className="glass-panel" loading="lazy" />
          <img src={about2} alt="Materials" className="glass-panel" style={{ marginTop: '2rem' }} loading="lazy" />
        </div>

        <div className="about-text glass-panel">
          <h2>Born in 2026, Built for Style</h2>
          <p>
            Founded in 2026, our store was built on a simple idea—to make fashion more personal, comfortable, and accessible for everyone. What started as a small neighborhood shop has grown into a space where style meets connection, offering carefully curated collections that reflect both modern trends and everyday ease.
          </p>
          <p>
            The store was founded by Johnson and Nancy, whose deep passion for fashion and strong sense of community brought this vision to life. What began as their shared dream has grown into a welcoming space where style feels personal and meaningful. Today, they continue to lead the store with dedication
          </p>

          <div className="values-grid">
            <div className="value-item">
              <h3 className="text-accent">01. COMMUNITY</h3>
              <p>A neighborhood store where every customer is welcomed like family.</p>
            </div>
            <div className="value-item">
              <h3 className="text-accent">02. PERSONAL STYLE</h3>
              <p>Helping you find outfits that truly reflect your individuality.</p>
            </div>
            <div className="value-item">
              <h3 className="text-accent">03. TRUST & COMFORT</h3>
              <p>Quality fashion that feels good to wear and easy to choose.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
