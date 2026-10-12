import { Link } from 'react-router-dom';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconShield,
  IconSyringe,
} from '../../../shared/icons/AppIcons';
import heroVaccine from '../../../assets/images/landing/hero-vaccine.jpg';

const highlights = ['Verified staff', 'Secure records', 'AI booking help'];

// Small app cards that float over the photo, like a glimpse of the portal.
// The details are illustrative only.
const chips = [
  { Icon: IconCalendar, title: 'Booking confirmed', sub: 'Tomorrow, 09:30', pos: 'top' },
  { Icon: IconSyringe, title: 'Next dose', sub: 'Hepatitis B in 14 days', pos: 'mid' },
  { Icon: IconShield, title: 'Verified hospital', sub: 'Ministry of Health', pos: 'bottom' },
];

export default function HeroSection({ onSeeHow }) {
  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">Vaccination made simple</span>
          <h1 className="hero-heading">Vaccine booking and records for Sri Lanka</h1>
          <p className="hero-lead">
            Book a vaccine online any time, get reminded when the next dose is due, and keep every
            record in one secure place.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="hero-btn hero-btn-primary">
              Book vaccine
              <IconArrowRight size={18} />
            </Link>
            <button type="button" className="hero-btn hero-btn-secondary" onClick={onSeeHow}>
              See how it works
            </button>
          </div>
          <ul className="hero-points">
            {highlights.map((item) => (
              <li key={item}>
                <IconCheck size={16} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-visual">
          <div className="hero-photo">
            <img
              src={heroVaccine}
              alt="Gloved hand holding a COVID-19 vaccine vial and syringe"
              loading="eager"
            />
          </div>
          {chips.map(({ Icon, title, sub, pos }) => (
            <div key={title} className={`hero-chip hero-chip-${pos}`} aria-hidden="true">
              <span className="hero-chip-icon">
                <Icon size={18} />
              </span>
              <span>
                <span className="hero-chip-title">{title}</span>
                <span className="hero-chip-sub">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
