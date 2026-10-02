import React from 'react';

export default function StaffSubpageHeader({ eyebrow, title, subtitle }) {
  return (
    <section className="hospital-hero-banner staff-subpage-hero">
      <div className="hospital-hero-content">
        <p className="hospital-hero-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hospital-hero-sub">{subtitle}</p>
      </div>
    </section>
  );
}
