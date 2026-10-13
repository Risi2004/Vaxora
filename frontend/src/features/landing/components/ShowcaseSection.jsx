import { Link } from 'react-router-dom';
import { IconArrowRight, IconCheck } from '../../../shared/icons/AppIcons';
import rowClinic from '../../../assets/images/landing/row-clinic.webp';
import rowRecords from '../../../assets/images/landing/row-records.avif';
import rowDose from '../../../assets/images/landing/row-dose.jpg';

// Each row pairs a photo with a small portal card drawn in HTML, so the
// card stays sharp and matches the real screens. The data is illustrative.

function AccessPreview() {
  const checks = [
    { label: 'Licence verified', sub: 'Ministry of Health' },
    { label: 'Role-based access', sub: 'Care team only' },
    { label: 'Action logged', sub: 'Audit trail, 10:42' },
  ];
  return (
    <div className="mock-card">
      <p className="mock-card-title">Record access</p>
      <ul className="mock-list">
        {checks.map((item) => (
          <li key={item.label} className="mock-row">
            <span>
              <span className="mock-value">{item.label}</span>
              <span className="mock-sub">{item.sub}</span>
            </span>
            <span className="mock-tick">
              <IconCheck size={14} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryPreview() {
  const doses = [
    { name: 'BCG', date: '12 Jan 2024', status: 'Given' },
    { name: 'MMR, dose 1', date: '03 Mar 2025', status: 'Given' },
    { name: 'Hepatitis B, dose 2', date: '14 Nov 2026', status: 'Due' },
  ];
  return (
    <div className="mock-card">
      <p className="mock-card-title">My vaccinations</p>
      <ul className="mock-list">
        {doses.map((dose) => (
          <li key={dose.name} className="mock-row">
            <span>
              <span className="mock-value">{dose.name}</span>
              <span className="mock-sub">{dose.date}</span>
            </span>
            <span className={`mock-chip ${dose.status === 'Due' ? 'is-due' : 'is-done'}`}>
              {dose.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClinicPreview() {
  const queue = [
    { token: '#12', name: 'N. Perera', state: 'Now' },
    { token: '#13', name: 'A. Silva', state: 'Waiting' },
    { token: '#14', name: 'K. Fernando', state: 'Waiting' },
  ];
  return (
    <div className="mock-card">
      <p className="mock-card-title">Booth 2 queue</p>
      <ul className="mock-list">
        {queue.map((item) => (
          <li key={item.token} className="mock-row">
            <span className="mock-person">
              <span className="mock-token">{item.token}</span>
              <span className="mock-value">{item.name}</span>
            </span>
            <span className={`mock-chip ${item.state === 'Now' ? 'is-now' : ''}`}>{item.state}</span>
          </li>
        ))}
      </ul>
      <div className="mock-stock">
        <span className="mock-sub">Hep B batch HB-2291</span>
        <span className="mock-value">84 doses left</span>
      </div>
    </div>
  );
}

const rows = [
  {
    title: 'Simplify every clinic day',
    text: 'Doctors, nurses and hospitals work from the same live picture of the day.',
    points: [
      'Booth queues for doctors and nurses',
      'Vaccine stock tracked by batch',
      'Shift rosters and cover in one place',
    ],
    link: { to: '/login', label: 'Staff log in' },
    image: rowClinic,
    alt: 'A nurse checking the day plan on a tablet',
    Preview: ClinicPreview,
  },
  {
    title: 'Safeguard patient records',
    text: 'Health data stays private, and every professional is checked before they join.',
    points: [
      'Staff and hospitals verified by the Ministry',
      'Only the care team can open a record',
      'Every admin action kept in an audit log',
    ],
    link: { to: '/signup', label: 'Create an account' },
    image: rowRecords,
    alt: 'Healthcare data security and protected patient records',
    Preview: AccessPreview,
  },
  {
    title: 'Every dose in a snap',
    text: 'Each dose is saved the moment it is given, so the history is always complete.',
    points: [
      'Full vaccination history in one place',
      'Care plan shows what is due next',
      'Reminders before the next dose',
    ],
    link: { to: '/signup', label: 'Book a vaccine' },
    image: rowDose,
    alt: 'A clinician applying a bandage after a vaccination',
    Preview: HistoryPreview,
  },
];

export default function ShowcaseSection() {
  return (
    <section className="landing-section showcase-section" aria-label="What Vaxora does">
      {rows.map(({ title, text, points, link, image, alt, Preview }) => (
        <div key={title} className="showcase-row">
          <div className="showcase-copy">
            <h2 className="showcase-title">{title}</h2>
            <p className="showcase-text">{text}</p>
            <ul className="showcase-points">
              {points.map((point) => (
                <li key={point}>
                  <IconCheck size={18} />
                  {point}
                </li>
              ))}
            </ul>
            <Link to={link.to} className="showcase-link">
              {link.label}
              <IconArrowRight size={16} />
            </Link>
          </div>
          <div className="showcase-media">
            <img src={image} alt={alt} className="showcase-photo" loading="lazy" />
            <div className="showcase-card" aria-hidden="true">
              <Preview />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
