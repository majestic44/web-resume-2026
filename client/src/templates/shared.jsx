export function ContactList({ item, className = '' }) {
  return (
    <ul className={className}>
      {item.email ? <li><a href={`mailto:${item.email}`}>{item.email}</a></li> : null}
      {item.phone ? <li><a href={`tel:${item.phone.replace(/[^\d+]/g, '')}`}>{item.phone}</a></li> : null}
      {item.linkedin ? <li><a href={item.linkedin}>{item.linkedin}</a></li> : null}
      {item.location ? <li>{item.location}</li> : null}
    </ul>
  );
}

export function ContactLine({ item, className = '' }) {
  return (
    <div className={className}>
      {[item.address, item.phone, item.email, item.linkedin].filter(Boolean).map(value => <span key={value}>{value}</span>)}
    </div>
  );
}

export function ResumeSection({ title, children, className = '' }) {
  return (
    <section className={className}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
