import { Link } from 'react-router-dom';
import { IconArrowRight } from '../../../shared/icons/AppIcons';
import rolePatient from '../../../assets/images/landing/role-patient.webp';
import roleDoctor from '../../../assets/images/landing/role-doctor.webp';
import roleNurse from '../../../assets/images/landing/role-nurse.webp';
import roleHospital from '../../../assets/images/landing/role-hospital.webp';
import roleAdmin from '../../../assets/images/landing/role-admin.webp';

const roles = [
  {
    name: 'Patients and families',
    image: rolePatient,
    tasks: ['Book appointments', 'View vaccination history', 'Get a care plan'],
    link: { to: '/signup', label: 'Sign up free' },
  },
  {
    name: 'Doctors',
    image: roleDoctor,
    tasks: ['Run the booth queue', 'Prescribe vaccines', 'Report reactions'],
    link: { to: '/login', label: 'Doctor log in' },
  },
  {
    name: 'Nurses',
    image: roleNurse,
    tasks: ['Administer doses', 'Record observations', 'Check patient history'],
    link: { to: '/login', label: 'Nurse log in' },
  },
  {
    name: 'Hospitals',
    image: roleHospital,
    tasks: ['Manage staff and rosters', 'Set up booths', 'Track vaccine stock'],
    link: { to: '/signup', label: 'Register a hospital' },
  },
  {
    name: 'Ministry admins',
    image: roleAdmin,
    tasks: ['Verify staff and hospitals', 'Review audit logs', 'Read feedback'],
    link: { to: '/login', label: 'Admin log in' },
  },
];

export default function RolesSection() {
  return (
    <section id="roles" className="landing-section">
      <div className="section-head">
        <span className="section-eyebrow">Built for every role</span>
        <h2 className="landing-section-title">Vaxora is right for everyone in the visit</h2>
        <p className="section-lead">
          Each person signs in to a workspace made for their job.
        </p>
      </div>

      <div className="role-grid">
        {roles.map(({ name, image, tasks, link }) => (
          <article key={name} className="role-card">
            <img src={image} alt="" className="role-photo" loading="lazy" />
            <div className="role-body">
              <h3 className="role-name">{name}</h3>
              <ul className="role-tasks">
                {tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
              <Link to={link.to} className="role-link">
                {link.label}
                <IconArrowRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
