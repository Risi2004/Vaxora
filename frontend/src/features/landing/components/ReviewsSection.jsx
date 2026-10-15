import { useState, useEffect, useCallback, useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "../../../shared/icons/AppIcons";
import { feedbackService } from "../../../shared/services/feedbackService";
import { deferEffectCallback } from "../../../shared/utils/deferEffectCallback.js";

const VISIBLE_DESKTOP = 3;
const MIN_CARDS = 6;
const SLIDE_MS = 650;
const PLACEHOLDER_REVIEWS = [
  {
    id: "p1",
    name: "Verified Citizen",
    comment: "Seamless booking and verified digital vaccination records.",
    rating: 5,
  },
  {
    id: "p2",
    name: "Patient",
    comment: "Got my booster reminder on time. Highly recommended!",
    rating: 5,
  },
  {
    id: "p3",
    name: "Parent",
    comment: "Quick process with clear hospital directions.",
    rating: 5,
  },
];

/** Pad so the strip can keep stepping one card at a time. */
function ensureCarouselReviews(list) {
  const source = list.length > 0 ? list : PLACEHOLDER_REVIEWS;
  const filled = [];
  let i = 0;
  while (filled.length < Math.max(MIN_CARDS, source.length)) {
    const item = source[i % source.length];
    filled.push({
      ...item,
      id: filled.length < source.length ? item.id : `${item.id}-loop-${filled.length}`,
    });
    i += 1;
  }
  return filled;
}

const renderStars = (rating) => (
  <span style={{ color: "var(--color-rating)", fontSize: "0.875rem", letterSpacing: 1 }}>
    {"★".repeat(rating)}
    <span style={{ color: "var(--color-border-card)" }}>{"★".repeat(5 - rating)}</span>
  </span>
);

function ReviewCard({ item }) {
  return (
    <article className="review-card">
      <div className="review-header">
        <span className="reviewer-name">{item.name}</span>
        {renderStars(item.rating || 5)}
      </div>
      <div className="review-body">
        <p className="review-comment">{item.comment || item.message}</p>
      </div>
      {item.category ? <div className="review-category">{item.category}</div> : null}
    </article>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(VISIBLE_DESKTOP);
  const [isPaused, setIsPaused] = useState(false);
  const [disableTransition, setDisableTransition] = useState(false);
  const snapModeRef = useRef(null); // 'start' | 'prev'

  useEffect(
    () =>
      deferEffectCallback(async () => {
        try {
          const data = await feedbackService.getPublicRandom(6);
          const list = Array.isArray(data) ? data : [];
          setReviews(ensureCarouselReviews(list));
        } catch (err) {
          console.warn("Could not load public reviews:", err);
          setReviews(ensureCarouselReviews([]));
        } finally {
          setLoading(false);
        }
      }),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      setVisible(mq.matches ? 1 : VISIBLE_DESKTOP);
      setIndex(0);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Clone leading cards so the last forward step can loop without a jump
  const slides =
    reviews.length > 0 ? [...reviews, ...reviews.slice(0, visible)] : [];
  const loopAt = reviews.length;

  const goNext = useCallback(() => {
    setIndex((prev) => prev + 1);
  }, []);

  const goPrev = useCallback(() => {
    setIndex((prev) => {
      if (prev > 0) return prev - 1;
      snapModeRef.current = "prev";
      setDisableTransition(true);
      return Math.max(loopAt, 0);
    });
  }, [loopAt]);

  // Forward loop: after landing on clones, snap to real start
  useEffect(() => {
    if (index !== loopAt || loopAt === 0) return undefined;
    const timer = window.setTimeout(() => {
      snapModeRef.current = "start";
      setDisableTransition(true);
      setIndex(0);
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, loopAt]);

  // Re-enable transition after a snap
  useEffect(() => {
    if (!disableTransition) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const mode = snapModeRef.current;
        snapModeRef.current = null;
        setDisableTransition(false);
        if (mode === "prev" && loopAt > 0) {
          setIndex(loopAt - 1);
        }
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [disableTransition, loopAt]);

  // Auto-advance one card at a time, right → left
  useEffect(() => {
    if (isPaused || reviews.length <= visible) return undefined;
    const timer = window.setInterval(goNext, 4000);
    return () => window.clearInterval(timer);
  }, [isPaused, goNext, reviews.length, visible]);

  const stepPercent = 100 / visible;

  return (
    <section id="reviews" className="reviews-section">
      <div className="section-head">
        <span className="section-eyebrow">Reviews</span>
        <h2 className="landing-section-title">What people say</h2>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 40 }}>
          Loading reviews…
        </p>
      ) : (
        <>
          <div
            className="carousel-wrapper"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{ "--reviews-visible": visible }}
          >
            <button
              type="button"
              className="carousel-btn prev-btn"
              onClick={goPrev}
              aria-label="Previous review"
            >
              <IconChevronLeft className="carousel-arrow" />
            </button>

            <div className="carousel-viewport">
              <div
                className={`carousel-track${disableTransition ? " is-jumping" : ""}`}
                style={{ transform: `translateX(-${index * stepPercent}%)` }}
              >
                {slides.map((item, slideIdx) => (
                  <div
                    key={`${item.id}-${slideIdx}`}
                    className="review-slide"
                    aria-hidden={slideIdx < index || slideIdx >= index + visible}
                  >
                    <ReviewCard item={item} />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="carousel-btn next-btn"
              onClick={goNext}
              aria-label="Next review"
            >
              <IconChevronRight className="carousel-arrow" />
            </button>
          </div>

          {loopAt > 1 && (
            <div
              className="carousel-dots"
              role="group"
              aria-label="Review navigation"
            >
              {Array.from({ length: loopAt }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`dot ${(index % loopAt) === idx ? "active" : ""}`}
                  onClick={() => setIndex(idx)}
                  aria-label={`Go to review ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
