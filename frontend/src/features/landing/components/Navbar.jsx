import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

export default function Navbar({ activeNav, onNavClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (section) => {
    onNavClick(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#home" className="brand-logo" onClick={() => handleNavClick('home')}>
          <img src={logo} alt="Vaxora Logo" className="logo-img" />
        </a>

        {/* Desktop Navigation Pill */}
        <nav className="nav-pill desktop-nav-pill" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
          >
            About
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
          >
            Contact us
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'reviews' ? 'active' : ''}`}
            onClick={() => handleNavClick('reviews')}
          >
            Reviews
          </button>
        </nav>

        {/* Desktop Header Actions */}
        <div className="header-actions desktop-header-actions">
          <Link to="/login" className="btn-login">
            Log in
          </Link>
          <Link to="/signup" className="btn-signup">
            Sign up
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <nav className="mobile-nav-links">
            <button
              type="button"
              className={`mobile-nav-link ${activeNav === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`mobile-nav-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => handleNavClick('about')}
            >
              About
            </button>
            <button
              type="button"
              className={`mobile-nav-link ${activeNav === 'contact' ? 'active' : ''}`}
              onClick={() => handleNavClick('contact')}
            >
              Contact us
            </button>
            <button
              type="button"
              className={`mobile-nav-link ${activeNav === 'reviews' ? 'active' : ''}`}
              onClick={() => handleNavClick('reviews')}
            >
              Reviews
            </button>
          </nav>

          <div className="mobile-drawer-actions">
            <Link to="/login" className="btn-login mobile-btn-login" onClick={() => setMobileMenuOpen(false)}>
              Log in
            </Link>
            <Link to="/signup" className="btn-signup mobile-btn-signup" onClick={() => setMobileMenuOpen(false)}>
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
