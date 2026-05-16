import React, { useState, useEffect } from 'react';
import './About.css';

const About = () => {
  const [about1, setAbout1] = useState('/hero-bg.png');
  const [about2, setAbout2] = useState('/hero-bg.png');

  useEffect(() => {
    const loadImages = () => {
      const savedAbout1 = localStorage.getItem('lookwalk_about_img_1');
      if (savedAbout1) setAbout1(savedAbout1);

      const savedAbout2 = localStorage.getItem('lookwalk_about_img_2');
      if (savedAbout2) setAbout2(savedAbout2);
    };

    loadImages(); // run on mount
    window.addEventListener('appearanceUpdated', loadImages);
    return () => window.removeEventListener('appearanceUpdated', loadImages);
  }, []);

  return (
    <div className="page-wrapper container animate-fade-in-up">
      <div className="about-header">
        <h1 className="title-glow">OUR <span className="text-accent">STORY</span></h1>
        <p className="about-subtitle">Where personal style meets comfort, crafted for everyday life.</p>
      </div>

      <div className="about-content">
        <div className="about-image-grid">
          <img src={about1} alt="Futuristic Studio" className="glass-panel" />
          <img src={about2} alt="Materials" className="glass-panel" style={{ marginTop: '2rem' }} />
        </div>

        <div className="about-text glass-panel">
          <h2>Born in 2026, Built for Style</h2>
          <p>
            Founded in 2026, our store was built on a simple idea—to make fashion more personal, comfortable, and accessible for everyone. What started as a small neighborhood shop has grown into a space where style meets connection, offering carefully curated collections that reflect both modern trends and everyday ease.
          </p>
          <p>
            The store was founded by Johnson and Nancy, whose deep passion for fashion and strong sense of community brought this vision to life. What began as their shared dream has grown into a welcoming space where style feels personal and meaningful. Today, they continue to lead the store with dedication, supported by their niece and a group of young, fashion-forward minds who bring fresh perspectives and creativity. This blend of experience and youthful energy allows us to constantly evolve, offering styles that are not only trendy but also relatable, ensuring every customer finds something that truly reflects their individuality.
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
