import React, { useState } from 'react';
import feedbackImg from '../../../assets/images/feedback.png';
import logo from '../../../assets/images/logo.png';

export default function FeedbackTab() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNo: '',
    message: '',
  });

  const [rating, setRating] = useState(4); // 4 stars selected by default as in mockup
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', contactNo: '', message: '' });
    setRating(4);
    setSubmitted(false);
  };

  return (
    <div className="manage-appointments-wrapper">
      {/* Outer Card Container */}
      <div className="feedback-split-card">
        {/* Left Side Curved Healthcare Image */}
        <div className="feedback-image-pane">
          <img
            src={feedbackImg}
            alt="Healthcare Patient Care"
            className="feedback-arch-img"
          />
        </div>

        {/* Right Side Form Container */}
        <div className="feedback-form-pane">
          <h1 className="feedback-main-title">
            Share Your Feedback
          </h1>

          {/* Bordered Card with Purple/Navy outline */}
          <div className="feedback-bordered-box">
            {/* Center Logo */}
            <div className="feedback-logo-wrap">
              <img src={logo} alt="Vaxora Logo" className="feedback-box-logo" />
            </div>

            {submitted ? (
              <div className="feedback-success-box">
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                <h3 className="feedback-success-title">
                  Thank You for Your Feedback!
                </h3>
                <p className="feedback-success-desc">
                  Your rating of <strong>{rating} stars</strong> and suggestions have been recorded
                  in our healthcare quality monitoring registry.
                </p>
                <button
                  type="button"
                  className="btn-feedback-submit"
                  style={{ marginTop: '16px' }}
                  onClick={handleReset}
                >
                  Submit Another Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-mockup-form">
                {/* Name */}
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name"
                  className="feedback-mockup-input"
                  required
                />

                {/* Email */}
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="feedback-mockup-input"
                  required
                />

                {/* Contact No */}
                <input
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  placeholder="Contact No"
                  className="feedback-mockup-input"
                  required
                />

                {/* Rating Row */}
                <div className="feedback-rating-row">
                  <span className="feedback-rating-label">Rating</span>
                  <div className="feedback-stars-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-icon-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        aria-label={`Rate ${star} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Message here"
                  rows="4"
                  className="feedback-mockup-textarea"
                  required
                />

                {/* Submit Button */}
                <button type="submit" className="btn-feedback-submit">
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
