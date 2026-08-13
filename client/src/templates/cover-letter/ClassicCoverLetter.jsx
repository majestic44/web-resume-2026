import { formatLongDate } from '../../lib/resume.js';

export function ClassicCoverLetter({ letter }) {
  return (
    <article className="resume-template-classic resume-template-classic--letter">
      <header className="resume-template-classic__letter-header">
        <h1>{letter.name}</h1>
        <div className="resume-template-classic__contact-line">
          {letter.address ? <span>{letter.address}</span> : null}
          {letter.phone ? <span>{letter.phone}</span> : null}
          {letter.email ? <a href={`mailto:${letter.email}`}>{letter.email}</a> : null}
        </div>
      </header>

      <section className="resume-template-classic__letter-body">
        <p className="resume-template-classic__letter-date">{formatLongDate()}</p>

        <div className="resume-template-classic__recipient">
          <p>{letter.recipientName}</p>
          {letter.recipientCompany ? <p>{letter.recipientCompany}</p> : null}
          {letter.recipientAddress.map(line => <p key={line}>{line}</p>)}
          <p>{letter.greeting}</p>
        </div>

        <article className="resume-template-classic__letter-content">
          {letter.opening ? <p>{letter.opening}</p> : null}
          {letter.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {letter.closing ? <p>{letter.closing}</p> : null}
        </article>

        <div className="resume-template-classic__letter-signoff">
          <p>{letter.signature}</p>
          <p>{letter.name}</p>
        </div>
      </section>
    </article>
  );
}
