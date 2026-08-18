import {
  Cog,
  Laptop,
  MapPin,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Users,
  Warehouse,
  Wrench
} from 'lucide-react';
import { ResumeSection } from '../shared.jsx';
import ProfileQRCode from '../../components/ProfileQRCode.jsx';
import { WorkHistory } from './WorkHistory.jsx';

const PRINT_WORK_LIMIT = 10;
const PRINT_WORK_ON_FIRST_PAGE = 4;

export function ModernResume({ resume, qrCodeUrl = '', onQrCodeReady }) {
  const initials = getInitials(resume.name);
  const printableWork = resume.work.slice(0, PRINT_WORK_LIMIT);
  const primaryPrintableWork = printableWork.slice(0, PRINT_WORK_ON_FIRST_PAGE);
  const continuedPrintableWork = printableWork.slice(PRINT_WORK_ON_FIRST_PAGE);

  return (
    <article className="resume-template-modern">
      <section className="resume-template-modern__hero">
        <div>
          <p className="eyebrow">Professional Resume</p>
          <h1>{resume.name}</h1>
          <p className="hero-role">{resume.headline}</p>
          <p className="resume-template-modern__hero-summary">{resume.summary}</p>
        </div>
        <aside className="resume-template-modern__contact-card">
          <div className="resume-template-modern__profile-photo" aria-label="Profile photo">
            {resume.image ? <img src={resume.image} alt={resume.name} /> : <span>{initials}</span>}
          </div>
          <ul className="resume-template-modern__contact-list">
            {resume.email ? <li><a href={`mailto:${resume.email}`}><Mail size={15} />{resume.email}</a></li> : null}
            {resume.phone ? <li><a href={`tel:${resume.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} />{resume.phone}</a></li> : null}
            {resume.linkedin ? <li><a href={resume.linkedin}><Users size={15} />{resume.linkedin}</a></li> : null}
            {resume.location ? <li><span><MapPin size={15} />{resume.location}</span></li> : null}
          </ul>
          {qrCodeUrl ? <ProfileQRCode shareUrl={qrCodeUrl} variant="header" onReady={onQrCodeReady} /> : null}
        </aside>
      </section>

      <section className="resume-template-modern__body">
        {resume.selectedStrengths.length ? (
          <ResumeSection title={resume.sectionTitles.strengths} className="resume-template-modern__section resume-template-modern__section--strengths">
            <div className="resume-template-modern__strength-list">
              {resume.selectedStrengths.map(strength => <span key={strength}>{strength}</span>)}
            </div>
          </ResumeSection>
        ) : null}

        <ResumeSection title={resume.sectionTitles.skills} className="resume-template-modern__section">
          <div className="resume-template-modern__skill-grid">
            {resume.skillGroups.map(group => (
              <article className="resume-template-modern__skill-group" key={group.name}>
                <h3>{group.name}</h3>
                <div className="resume-template-modern__skill-list">
                  {group.keywords.map(skill => (
                    <span className="resume-template-modern__skill-chip" key={skill}>
                      {getSkillIcon(skill, group.name)}
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </ResumeSection>

        <ResumeSection title={resume.sectionTitles.work} className="resume-template-modern__section">
          <WorkHistory work={resume.work} />
        </ResumeSection>

        {resume.volunteer.length ? (
          <ResumeSection title={resume.sectionTitles.volunteer} className="resume-template-modern__section">
            {resume.volunteer.map((item, index) => (
              <article className="resume-template-modern__simple-entry" key={`${item.organization}-${item.position}-${index}`}>
                <h3>{item.position}</h3>
                <p>{[item.organization, item.location].filter(Boolean).join(' | ')}</p>
                {item.highlights?.length ? (
                  <ul className="resume-template-modern__simple-bullets">
                    {item.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </ResumeSection>
        ) : null}

        {resume.education.length ? (
          <ResumeSection title={resume.sectionTitles.education} className="resume-template-modern__section">
            {resume.education.map((item, index) => (
              <article className="resume-template-modern__simple-entry" key={`${item.institution}-${index}`}>
                <h3>{item.area}</h3>
                <p>{[item.institution, item.location].filter(Boolean).join(' | ')}</p>
                {item.endDate ? <span>{item.endDate}</span> : null}
              </article>
            ))}
          </ResumeSection>
        ) : null}
      </section>

      <section className="resume-template-modern__print-body" aria-label="Printable resume content">
        <div className="resume-template-modern__print-page-one">
          <aside className="resume-template-modern__print-sidebar">
            {resume.selectedStrengths.length ? (
              <ResumeSection title={resume.sectionTitles.strengths} className="resume-template-modern__section resume-template-modern__section--strengths">
                <div className="resume-template-modern__strength-list">
                  {resume.selectedStrengths.map(strength => <span key={strength}>{strength}</span>)}
                </div>
              </ResumeSection>
            ) : null}

            <ResumeSection title={resume.sectionTitles.skills} className="resume-template-modern__section">
              <div className="resume-template-modern__skill-grid">
                {resume.skillGroups.map(group => (
                  <article className="resume-template-modern__skill-group" key={group.name}>
                    <h3>{group.name}</h3>
                    <div className="resume-template-modern__skill-list">
                      {group.keywords.map(skill => (
                        <span className="resume-template-modern__skill-chip" key={skill}>
                          {getSkillIcon(skill, group.name)}
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </ResumeSection>

            {resume.education.length ? (
              <ResumeSection title={resume.sectionTitles.education} className="resume-template-modern__section">
                {resume.education.map((item, index) => (
                  <article className="resume-template-modern__simple-entry" key={`${item.institution}-${index}`}>
                    <h3>{item.area}</h3>
                    <p>{[item.institution, item.location].filter(Boolean).join(' | ')}</p>
                    {item.endDate ? <span>{item.endDate}</span> : null}
                  </article>
                ))}
              </ResumeSection>
            ) : null}
          </aside>

          <ResumeSection title={resume.sectionTitles.work} className="resume-template-modern__section resume-template-modern__print-work-primary">
            <WorkHistory work={primaryPrintableWork} />
          </ResumeSection>
        </div>

        {continuedPrintableWork.length ? (
          <ResumeSection title={`${resume.sectionTitles.work} Continued`} className="resume-template-modern__section resume-template-modern__print-work-continuation">
            <WorkHistory work={continuedPrintableWork} />
          </ResumeSection>
        ) : null}
      </section>
    </article>
  );
}

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

function getSkillIcon(skill = '', group = '') {
  const token = `${skill} ${group}`.toLowerCase();

  if (/sap|data|system|computer|it|office|windows|hardware|network/.test(token)) return <Laptop size={14} />;
  if (/safety|security/.test(token)) return <Shield size={14} />;
  if (/forklift|crane|saw|equipment|industrial/.test(token)) return <Cog size={14} />;
  if (/warehouse|shipping|receiving|inventory|logistics|material/.test(token)) return <Warehouse size={14} />;
  if (/lead|leadership|coordination|team/.test(token)) return <Users size={14} />;
  if (/problem|troubleshooting|repair/.test(token)) return <Wrench size={14} />;

  return <Sparkles size={14} />;
}
