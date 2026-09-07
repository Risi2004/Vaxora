import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p className="footer-tagline">
          Vaxora | Making Vaccination booking simple & secure
        </p>
        <p className="footer-copyright">
          @{currentYear} Vaxora. All rights reserved
        </p>
      </div>
    </footer>
  );
}
