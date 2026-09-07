import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/images/logo.png';

export default function Navbar({ activeNav, onNavClick }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#home" className="brand-logo" onClick={() => onNavClick('home')}>
          <img src={logo} alt="Vaxora Logo" className="logo-img" />
        </a>

        <nav className="nav-pill" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => onNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
            onClick={() => onNavClick('about')}
          >
            About
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'contact' ? 'active' : ''}`}
            onClick={() => onNavClick('contact')}
          >
            Contact us
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'reviews' ? 'active' : ''}`}
            onClick={() => onNavClick('reviews')}
          >
            Reviews
          </button>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn-login">
            Log in
          </Link>
          <Link to="/signup" className="btn-signup">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
