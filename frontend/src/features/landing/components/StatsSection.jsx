import React from 'react';
import badgeExperience from '../../../assets/icons/badge_experience.svg';
import networkMembers from '../../../assets/icons/network_members.svg';
import hospitalDoctors from '../../../assets/icons/hospital_doctors.svg';
import chartReviews from '../../../assets/icons/chart_reviews.svg';

const statsData = [
  {
    icon: badgeExperience,
    alt: 'Experience badge',
    highlight: '5 years experience',
    subtext: 'Since 2019',
  },
  {
    icon: networkMembers,
    alt: 'Connected members',
    highlight: '10K plus',
    subtext: 'members',
  },
  {
    icon: hospitalDoctors,
    alt: 'Hospitals and doctors',
    highlight: '20+ hospitals',
    subtext: '60+ doctors',
  },
  {
    icon: chartReviews,
    alt: 'Reviews growth chart',
    highlight: '2K plus',
    subtext: 'Reviews',
  },
];

export default function StatsSection() {
  return (
    <section className="stats-section" aria-label="Portal Statistics">
      <div className="stats-grid">
        {statsData.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-icon-wrapper">
              <img src={stat.icon} alt={stat.alt} className="stat-icon" />
            </div>
            <div className="stat-text">
              <h3 className="stat-highlight">{stat.highlight}</h3>
              <p className="stat-subtext">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
