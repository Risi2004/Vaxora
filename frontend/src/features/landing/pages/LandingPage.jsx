import React, { useState } from 'react';

import {
  Navbar,
  HeroSection,
  AboutSection,
  StatsSection,
  ContactSection,
  ReviewsSection,
  Footer,
} from '../components';

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState('home');

  const scrollToSection = (id) => {
    setActiveNav(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const focusContactForm = () => {
    scrollToSection('contact');
    const nameInput = document.getElementById('contact-name-input');
    if (nameInput) {
      nameInput.focus();
    }
  };

  return (
    <div className="landing-container">
      {/* 1. Header / Navigation */}
      <Navbar
        activeNav={activeNav}
        onNavClick={scrollToSection}
      />

      <main>
        {/* 2. Hero Section */}
        <HeroSection onBookClick={focusContactForm} />

        {/* 3. About the Portal */}
        <AboutSection />

        {/* 4. Portal Statistics & Impact Badges */}
        <StatsSection />

        {/* 5. Contact Us & Booking Form */}
        <ContactSection onArrowClick={focusContactForm} />

        {/* 6. User Reviews Carousel */}
        <ReviewsSection />
      </main>

      {/* 7. Footer */}
      <Footer />
    </div>
  );
}
