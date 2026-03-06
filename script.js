async function loadResume() {
  const response = await fetch('resume.json');
  if (!response.ok) throw new Error('Unable to load resume data.');
  return response.json();
}

function normalizeResumeData(data) {
  const basics = data.basics || {};
  const fallbackLocation = typeof data.location === 'string' ? data.location : '';
  const locationParts = [
    basics.location?.city,
    basics.location?.region,
    basics.location?.country
  ].filter(Boolean);

  const normalizeSkillGroups = inputSkills => {
    if (!Array.isArray(inputSkills) || inputSkills.length === 0) return [];

    const allStrings = inputSkills.every(item => typeof item === 'string');
    if (allStrings) {
      return [
        {
          name: 'Core Skills',
          keywords: [...new Set(inputSkills.filter(Boolean))]
        }
      ];
    }

    return inputSkills
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const keywords = Array.isArray(item.keywords)
          ? [...new Set(item.keywords.filter(Boolean))]
          : [];
        if (keywords.length === 0) return null;
        return {
          name: item.name || 'Core Skills',
          keywords
        };
      })
      .filter(Boolean);
  };

  return {
    name: basics.name || data.name || 'Your Name',
    headline: basics.headline || data.title || '',
    email: basics.email || data.email || '',
    phone: basics.phone || data.phone || '',
    linkedin:
      basics.linkedin ||
      data.linkedin ||
      basics.profiles?.find(profile => (profile.network || '').toLowerCase() === 'linkedin')?.url ||
      '',
    location: locationParts.join(', ') || fallbackLocation,
    image: basics.image || data.image || data.images?.profile || '',
    summary: basics.summary || data.summary || '',
    skillGroups: normalizeSkillGroups(data.skills),
    work: Array.isArray(data.work)
      ? data.work
      : Array.isArray(data.experience)
        ? data.experience.map(item => ({
            position: item.role || '',
            company: item.company || '',
            location: item.location || '',
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            dateLabel: item.dates || '',
            highlights: Array.isArray(item.bullets) ? item.bullets : []
          }))
        : [],
    education: Array.isArray(data.education)
      ? data.education.map(item => ({
          area: item.area || item.credential || '',
          institution: item.institution || item.school || '',
          location: item.location || '',
          endDate: item.endDate || item.dates || ''
        }))
      : [],
    volunteer: Array.isArray(data.volunteer)
      ? data.volunteer.map(item => ({
          position: item.position || item.role || '',
          organization: item.organization || '',
          location: item.location || '',
          highlights: Array.isArray(item.highlights)
            ? item.highlights
            : Array.isArray(item.bullets)
              ? item.bullets
              : []
        }))
      : []
  };
}

function sectionTitle(text) {
  return `<h2 class="section-title">${text}</h2>`;
}

function formatDate(value) {
  if (!value) return 'Present';
  const [year, month] = value.split('-');
  if (!year) return value;
  if (!month) return year;

  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

function renderSkills(groups) {
  const singleDefaultGroup =
    groups.length === 1 && groups[0].name.toLowerCase() === 'core skills';

  return groups
    .map(
      group => `
    <article class="skill-group">
      ${singleDefaultGroup ? '' : `<h3 class="skill-group-title">${group.name}</h3>`}
      <div class="skill-grid">
        ${group.keywords.map(skill => `<span class="skill-chip">${skill}</span>`).join('')}
      </div>
    </article>
  `
    )
    .join('');
}

function renderExperience(items) {
  return items
    .map(
      item => `
    <article class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-role">${item.position}</div>
          <div class="entry-company">${item.company} - ${item.location}</div>
        </div>
        <div class="entry-dates">${item.dateLabel || formatDateRange(item.startDate, item.endDate)}</div>
      </div>
      <ul>
        ${(item.highlights || []).map(bullet => `<li>${bullet}</li>`).join('')}
      </ul>
    </article>
  `
    )
    .join('');
}

function renderEducation(items) {
  return items
    .map(
      item => `
    <article class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-role">${item.area}</div>
          <div class="entry-company">${item.institution} - ${item.location}</div>
        </div>
        <div class="entry-dates">${formatDate(item.endDate)}</div>
      </div>
    </article>
  `
    )
    .join('');
}

function renderVolunteer(items) {
  return items
    .map(
      item => `
    <article class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-role">${item.position}</div>
          <div class="entry-company">${item.organization} - ${item.location}</div>
        </div>
      </div>
      <ul>
        ${(item.highlights || []).map(bullet => `<li>${bullet}</li>`).join('')}
      </ul>
    </article>
  `
    )
    .join('');
}

function renderResume(data) {
  const resume = normalizeResumeData(data);
  const root = document.getElementById('resumeRoot');
  const initials = getInitials(resume.name);

  root.innerHTML = `
    <section class="hero">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Resume</p>
          <h1>${resume.name}</h1>
          <div class="title">${resume.headline}</div>
        </div>
        <div class="hero-aside">
          <div class="profile-photo" aria-label="Profile photo">
            ${
              resume.image
                ? `<img src="${resume.image}" alt="${resume.name}" loading="eager" />`
                : `<span>${initials}</span>`
            }
          </div>
          <div class="contact-row">
            ${resume.email ? `<a href="mailto:${resume.email}">${resume.email}</a>` : ''}
            ${resume.phone ? `<a href="tel:${resume.phone.replace(/[^\d+]/g, '')}">${resume.phone}</a>` : ''}
            ${resume.linkedin ? `<a href="${resume.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : ''}
            ${resume.location ? `<span>${resume.location}</span>` : ''}
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <section class="section">
        ${sectionTitle('Professional Summary')}
        <p class="summary">${resume.summary}</p>
      </section>

      <section class="section">
        ${sectionTitle('Core Skills')}
        <div class="skills-layout">
          ${renderSkills(resume.skillGroups)}
        </div>
      </section>

      <section class="section">
        ${sectionTitle('Professional Experience')}
        ${renderExperience(resume.work)}
      </section>

      <section class="section two-col">
        <div>
          ${sectionTitle('Education')}
          ${renderEducation(resume.education)}
        </div>
        <div>
          ${sectionTitle('Volunteer Experience')}
          ${renderVolunteer(resume.volunteer)}
        </div>
      </section>
    </section>
  `;
}

document.getElementById('printBtn').addEventListener('click', () => window.print());

loadResume()
  .then(renderResume)
  .catch(error => {
    document.getElementById('resumeRoot').innerHTML = `
      <section class="content">
        <h1>Unable to load resume</h1>
        <p>${error.message}</p>
      </section>
    `;
  });
