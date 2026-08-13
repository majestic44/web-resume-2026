import { Mail, MapPin, Phone, Users } from 'lucide-react';
import { formatLongDate } from '../../lib/resume.js';

export function ModernCoverLetter({ letter }) {
  const initials = getInitials(letter.name);

  return (
    <article className="resume-template-modern resume-template-modern--letter">
      <header className="resume-template-modern__hero">
        <div>
          <p className="eyebrow">Cover Letter</p>
          <h1>{letter.name}</h1>
          <p className="hero-role">{letter.headline}</p>
        </div>
        <aside className="resume-template-modern__contact-card">
          <div className="resume-template-modern__profile-photo" aria-label="Profile photo">
            {letter.image ? <img src={letter.image} alt={letter.name} /> : <span>{initials}</span>}
          </div>
          <ul className="resume-template-modern__contact-list">
            {letter.email ? <li><a href={`mailto:${letter.email}`}><Mail size={15} />{letter.email}</a></li> : null}
            {letter.phone ? <li><a href={`tel:${letter.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} />{letter.phone}</a></li> : null}
            {letter.linkedin ? <li><a href={letter.linkedin}><Users size={15} />{letter.linkedin}</a></li> : null}
            {letter.location ? <li><span><MapPin size={15} />{letter.location}</span></li> : null}
          </ul>
        </aside>
      </header>

      <section className="resume-template-modern__letter-body">
        <div className="resume-template-modern__letter-meta">
          <div>
            <p className="resume-template-modern__letter-date">{formatLongDate()}</p>
            <div className="resume-template-modern__recipient">
              <p>{letter.recipientName}</p>
              {letter.recipientCompany ? <p>{letter.recipientCompany}</p> : null}
              {letter.recipientAddress.map(line => <p key={line}>{line}</p>)}
            </div>
          </div>
        </div>

        <article className="resume-template-modern__letter-content">
          <p>{letter.greeting}</p>
          {letter.opening ? <p>{letter.opening}</p> : null}
          {letter.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {letter.closing ? <p>{letter.closing}</p> : null}
          <div className="resume-template-modern__letter-signoff">
            <p>{letter.signature}</p>
            <p className="resume-template-modern__letter-name">{letter.name}</p>
          </div>
        </article>
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
