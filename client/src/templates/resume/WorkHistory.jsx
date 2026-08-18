function isCurrentRole(dateLabel = '') {
  return /\b(present|current)\b/i.test(String(dateLabel));
}

export function WorkHistory({ work }) {
  return (
    <div className="resume-template-modern__timeline">
      {work.map((item, index) => (
        <article className={`resume-template-modern__timeline-item${isCurrentRole(item.dateLabel) ? ' is-current' : ''}`} key={`${item.company}-${item.position}-${index}`}>
          <div className="resume-template-modern__role-row">
            <div>
              <h3>{item.position}</h3>
              <p>{[item.company, item.location].filter(Boolean).join(' | ')}</p>
            </div>
            <span>{item.dateLabel}</span>
          </div>
          {item.highlights?.length ? (
            <ul>
              {item.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
