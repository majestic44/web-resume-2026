export function ClassicResume({ resume }) {
  const skillList = resume.skillGroups.flatMap(group => group.keywords);

  return (
    <article className="resume-template-classic">
      <header className="resume-template-classic__header">
        <h1>{resume.name}</h1>
        <div className="resume-template-classic__contact-line">
          {resume.address ? <span>{resume.address}</span> : null}
          {resume.phone ? <span>{resume.phone}</span> : null}
          {resume.email ? <a href={`mailto:${resume.email}`}>{resume.email}</a> : null}
          {resume.linkedin ? <a href={resume.linkedin}>{resume.linkedin}</a> : null}
        </div>
      </header>

      <section className="resume-template-classic__section">
        <div className="resume-template-classic__section-title">
          <span className="resume-template-classic__rule" />
          <h2>{resume.sectionTitles.summary}</h2>
          <span className="resume-template-classic__rule" />
        </div>
        <p className="resume-template-classic__summary">{resume.summary}</p>
      </section>

      {resume.selectedStrengths.length ? (
        <section className="resume-template-classic__section">
          <div className="resume-template-classic__section-title">
            <span className="resume-template-classic__rule" />
            <h2>{resume.sectionTitles.strengths}</h2>
            <span className="resume-template-classic__rule" />
          </div>
          <div className="resume-template-classic__skills">
            {resume.selectedStrengths.map(strength => <div className="resume-template-classic__skill-item" key={strength}>{strength}</div>)}
          </div>
        </section>
      ) : null}

      {skillList.length ? (
        <section className="resume-template-classic__section">
          <div className="resume-template-classic__section-title">
            <span className="resume-template-classic__rule" />
            <h2>{resume.sectionTitles.skills}</h2>
            <span className="resume-template-classic__rule" />
          </div>
          <div className="resume-template-classic__skills">
            {skillList.map(skill => <div className="resume-template-classic__skill-item" key={skill}>{skill}</div>)}
          </div>
        </section>
      ) : null}

      <section className="resume-template-classic__section">
        <div className="resume-template-classic__section-title">
          <span className="resume-template-classic__rule" />
          <h2>{resume.sectionTitles.work}</h2>
          <span className="resume-template-classic__rule" />
        </div>
        <div className="resume-template-classic__timeline">
          {resume.work.map((item, index) => (
            <article className="resume-template-classic__timeline-item" key={`${item.company}-${item.position}-${index}`}>
              <div className="resume-template-classic__job-heading">
                <h3>
                  <span className="resume-template-classic__company">{item.company}</span>
                  <span className="resume-template-classic__separator"> | </span>
                  <span className="resume-template-classic__position">{item.position}</span>
                </h3>
                <div className="resume-template-classic__job-meta">
                  {item.location ? <span>{item.location}</span> : null}
                  {item.dateLabel ? <span>{item.dateLabel}</span> : null}
                </div>
              </div>
              {item.highlights?.length ? (
                <ul className="resume-template-classic__bullets">
                  {item.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {resume.education.length ? (
        <section className="resume-template-classic__section">
          <div className="resume-template-classic__section-title">
            <span className="resume-template-classic__rule" />
            <h2>{resume.sectionTitles.education}</h2>
            <span className="resume-template-classic__rule" />
          </div>
          <div className="resume-template-classic__simple-list">
          {resume.education.map((item, index) => (
            <article className="resume-template-classic__simple-entry" key={`${item.institution}-${index}`}>
              <h3>{item.area}</h3>
              {[item.institution, item.location].filter(Boolean).length ? (
                <div className="resume-template-classic__education-school">{[item.institution, item.location].filter(Boolean).join(' | ')}</div>
              ) : null}
              {item.endDate ? <div className="resume-template-classic__education-date">{item.endDate}</div> : null}
            </article>
          ))}
          </div>
        </section>
      ) : null}

      {resume.volunteer.length ? (
        <section className="resume-template-classic__section">
          <div className="resume-template-classic__section-title">
            <span className="resume-template-classic__rule" />
            <h2>{resume.sectionTitles.volunteer}</h2>
            <span className="resume-template-classic__rule" />
          </div>
          <div className="resume-template-classic__simple-list">
            {resume.volunteer.map((item, index) => (
              <article className="resume-template-classic__simple-entry" key={`${item.organization}-${item.position}-${index}`}>
                <h3>{item.position}</h3>
                {[item.organization, item.location].filter(Boolean).length ? (
                  <div className="resume-template-classic__education-school">{[item.organization, item.location].filter(Boolean).join(' | ')}</div>
                ) : null}
                {item.highlights?.length ? (
                  <ul className="resume-template-classic__bullets">
                    {item.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
