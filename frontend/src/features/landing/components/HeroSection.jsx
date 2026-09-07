import React from 'react';
import heroVaccine from '../../../assets/images/hero_vaccine.jpg';

export default function HeroSection({ onBookClick }) {
  return (
    <section id="home" className="hero-section">
      <div className="hero-grid">
        <div className="hero-content">
          <h1 className="hero-title">
            Book Your Vaccine In few Minutes
          </h1>
          <p className="hero-subtitle">
            Streamlining healthcare with secure, accessible, and efficient vaccination management for all Sri Lankans
          </p>
          <button
            type="button"
            className="btn-primary btn-book"
            onClick={onBookClick}
          >
            Book Vaccine
          </button>
        </div>

        <div className="hero-media-wrapper">
          <div className="hero-card">
            <img
              src={heroVaccine}
              alt="Medical professional holding vaccine vial and syringe"
              className="hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
