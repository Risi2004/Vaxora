import React from 'react';

export default function HospitalSubpageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="hospital-subpage-hero">
      <p className="hospital-hero-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="hospital-hero-sub">{subtitle}</p>
    </section>
  );
}
