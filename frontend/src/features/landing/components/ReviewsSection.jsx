import React, { useState, useEffect, useRef } from 'react';
import previousIcon from '../../../assets/icons/previous.svg';
import nextIcon from '../../../assets/icons/next.svg';

const reviewsData = [
  {
    id: 1,
    name: 'Kumar',
    comment: 'thank you for the services',
    role: 'Verified Citizen',
  },
  {
    id: 2,
    name: 'Anura',
    comment: "It's more helpful for me",
    role: 'Patient',
  },
  {
    id: 3,
    name: 'Kajol',
    comment: 'thank you',
    role: 'Parent',
  },
  {
    id: 4,
    name: 'Dr. Dilshan',
    comment: 'Seamless scheduling and verified digital vaccination records.',
    role: 'Medical Officer',
  },
  {
    id: 5,
    name: 'Nimali',
    comment: 'Got my booster dose reminder right on time. Highly recommended!',
    role: 'Verified Citizen',
  },
  {
    id: 6,
    name: 'Tharindu',
    comment: 'Quick booking process with clear hospital directions and timely alerts.',
    role: 'Patient',
  },
];

export default function ReviewsSection() {
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const cardsPerPage = 3;

  // Split reviews into pages of 3 cards
  const pages = [];
  for (let i = 0; i < reviewsData.length; i += cardsPerPage) {
    pages.push(reviewsData.slice(i, i + cardsPerPage));
  }
  const maxPages = pages.length;

  const handleNextReview = () => {
    setReviewIndex((prev) => (prev + 1) % maxPages);
  };

  const handlePrevReview = () => {
    setReviewIndex((prev) => (prev - 1 + maxPages) % maxPages);
  };

  // Optional subtle auto-sliding with hover pause
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      handleNextReview();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, maxPages]);

  return (
    <section id="reviews" className="reviews-section">
      <h2 className="reviews-title">Watch our user reviews</h2>

      <div
        className="carousel-wrapper"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <button
          type="button"
          className="carousel-btn prev-btn"
          onClick={handlePrevReview}
          aria-label="Previous reviews"
        >
          <img src={previousIcon} alt="Previous" className="carousel-arrow" />
        </button>

        {/* Sliding Viewport & Track */}
        <div className="carousel-viewport">
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${reviewIndex * 100}%)` }}
          >
            {pages.map((pageReviews, pageIdx) => (
              <div
                key={pageIdx}
                className={`reviews-page ${reviewIndex === pageIdx ? 'active-page' : ''}`}
                aria-hidden={reviewIndex !== pageIdx}
              >
                {pageReviews.map((item) => (
                  <div key={item.id} className="review-card">
                    <div className="review-header">
                      <span className="reviewer-name">{item.name}</span>
                    </div>
                    <div className="review-body">
                      <p className="review-comment">{item.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="carousel-btn next-btn"
          onClick={handleNextReview}
          aria-label="Next reviews"
        >
          <img src={nextIcon} alt="Next" className="carousel-arrow" />
        </button>
      </div>

      {/* Smooth Indicator Dots */}
      <div className="carousel-dots" role="tablist" aria-label="Review page navigation">
        {Array.from({ length: maxPages }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`dot ${reviewIndex === idx ? 'active' : ''}`}
            onClick={() => setReviewIndex(idx)}
            aria-label={`Go to review slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
