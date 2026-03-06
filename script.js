async function loadResume() {
  const response = await fetch('resume.json');
  if (!response.ok) throw new Error('Unable to load resume data.');
  return response.json();
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeResumeData(data) {
  const basics = data.basics || {};
  const fallbackLocation = typeof data.location === 'string' ? data.location : '';
  const locationParts = [basics.location?.city, basics.location?.region, basics.location?.country].filter(Boolean);

  const normalizeSkillGroups = inputSkills => {
    if (!Array.isArray(inputSkills) || inputSkills.length === 0) return [];

    const allStrings = inputSkills.every(item => typeof item === 'string');
    if (allStrings) {
      return [{ name: 'Core Skills', keywords: [...new Set(inputSkills.filter(Boolean))] }];
    }

    return inputSkills
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const keywords = Array.isArray(item.keywords) ? [...new Set(item.keywords.filter(Boolean))] : [];
        if (keywords.length === 0) return null;
        return { name: item.name || 'Core Skills', keywords };
      })
      .filter(Boolean);
  };

  return {
    name: basics.name || data.name || 'Your Name',
    headline: basics.headline || data.title || 'Operations and Systems Professional',
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

function formatDate(value) {
  if (!value) return 'Present';
  if (/^[A-Za-z]{3}\s\d{4}$/.test(value) || /^[A-Za-z]+\s\d{4}$/.test(value)) return value;

  const [year, month] = String(value).split('-');
  if (!year) return value;
  if (!month) return year;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

function iconClassForSkill(skill = '', group = '') {
  const token = `${skill} ${group}`.toLowerCase();

  if (/sap|data|system|computer|it|office|windows|hardware|network/.test(token)) return 'fa-solid fa-laptop-code';
  if (/safety|security/.test(token)) return 'fa-solid fa-shield-halved';
  if (/forklift|crane|saw|equipment|industrial/.test(token)) return 'fa-solid fa-gears';
  if (/warehouse|shipping|receiving|inventory|logistics|material/.test(token)) return 'fa-solid fa-warehouse';
  if (/lead|leadership|coordination|team/.test(token)) return 'fa-solid fa-people-group';
  if (/problem|troubleshooting/.test(token)) return 'fa-solid fa-screwdriver-wrench';

  return 'fa-solid fa-star';
}

function renderSkillGroups(groups) {
  return groups
    .map(
      group => `
      <article class="skill-group">
        <h3>${escapeHtml(group.name)}</h3>
        <div class="skill-list">
          ${group.keywords
            .map(
              skill => `
                <span class="skill-chip">
                  <i class="${iconClassForSkill(skill, group.name)}" aria-hidden="true"></i>
                  ${escapeHtml(skill)}
                </span>
              `
            )
            .join('')}
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
      <article class="timeline-item">
        <div class="role-row">
          <div>
            <h3 class="role-title">${escapeHtml(item.position)}</h3>
            <div class="role-meta">${escapeHtml(item.company)}${item.location ? ` | ${escapeHtml(item.location)}` : ''}</div>
          </div>
          <div class="role-dates">${escapeHtml(item.dateLabel || formatDateRange(item.startDate, item.endDate))}</div>
        </div>
        ${
          item.highlights?.length
            ? `<ul>${item.highlights.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`
            : ''
        }
      </article>
      `
    )
    .join('');
}

function renderEducation(items) {
  return items
    .map(
      item => `
      <article class="simple-entry">
        <h3 class="simple-title">${escapeHtml(item.area)}</h3>
        <div class="simple-meta">${escapeHtml(item.institution)}${item.location ? ` | ${escapeHtml(item.location)}` : ''}</div>
        <div class="role-dates">${escapeHtml(formatDate(item.endDate))}</div>
      </article>
      `
    )
    .join('');
}

function renderVolunteer(items) {
  return items
    .map(
      item => `
      <article class="simple-entry">
        <h3 class="simple-title">${escapeHtml(item.position)}</h3>
        <div class="simple-meta">${escapeHtml(item.organization)}${item.location ? ` | ${escapeHtml(item.location)}` : ''}</div>
        ${
          item.highlights?.length
            ? `<ul>${item.highlights.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`
            : ''
        }
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
          <p class="eyebrow">Professional Portfolio</p>
          <h1>${escapeHtml(resume.name)}</h1>
          <p class="hero-role">${escapeHtml(resume.headline)}</p>
          <p class="hero-summary">${escapeHtml(resume.summary)}</p>
        </div>
        <aside class="hero-card">
          <div class="profile-photo" aria-label="Profile photo">
            ${
              resume.image
                ? `<img src="${escapeHtml(resume.image)}" alt="${escapeHtml(resume.name)}" loading="eager" />`
                : `<span>${escapeHtml(initials)}</span>`
            }
          </div>
          <ul class="hero-links">
            ${resume.email ? `<li><a href="mailto:${escapeHtml(resume.email)}"><i class="fa-solid fa-envelope"></i>${escapeHtml(resume.email)}</a></li>` : ''}
            ${resume.phone ? `<li><a href="tel:${escapeHtml(resume.phone.replace(/[^\d+]/g, ''))}"><i class="fa-solid fa-phone"></i>${escapeHtml(resume.phone)}</a></li>` : ''}
            ${resume.linkedin ? `<li><a href="${escapeHtml(resume.linkedin)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin"></i>LinkedIn Profile</a></li>` : ''}
            ${resume.location ? `<li><span><i class="fa-solid fa-location-dot"></i>${escapeHtml(resume.location)}</span></li>` : ''}
          </ul>
        </aside>
      </div>
    </section>

    <section class="section-wrap">
      <section class="section">
        <h2>Core Skills</h2>
        <div class="skills-grid">${renderSkillGroups(resume.skillGroups)}</div>
      </section>

      <section class="section">
        <h2>Experience Timeline</h2>
        <div class="timeline">${renderExperience(resume.work)}</div>
      </section>

      <section class="section two-col">
        <div>
          <h2>Education</h2>
          ${renderEducation(resume.education)}
        </div>
        <div>
          <h2>Volunteer Work</h2>
          ${renderVolunteer(resume.volunteer)}
        </div>
      </section>
    </section>
  `;
}

function setTheme(theme) {
  const html = document.documentElement;
  const body = document.body;
  const button = document.getElementById('themeBtn');
  const mode = theme === 'dark' ? 'dark' : 'light';

  html.setAttribute('data-theme', mode);
  body.classList.toggle('theme-dark', mode === 'dark');

  try {
    localStorage.setItem('portfolio-theme', mode);
  } catch (error) {
    // Ignore storage failures (private mode / restricted contexts).
  }

  const isDark = mode === 'dark';
  if (button) {
    button.innerHTML = isDark
      ? '<i class="fa-solid fa-sun"></i><span>Light</span>'
      : '<i class="fa-solid fa-moon"></i><span>Dark</span>';
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem('portfolio-theme');
  } catch (error) {
    saved = null;
  }

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));

  const themeBtn = document.getElementById('themeBtn');
  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

document.getElementById('printBtn').addEventListener('click', () => window.print());

initTheme();

loadResume()
  .then(renderResume)
  .catch(error => {
    document.getElementById('resumeRoot').innerHTML = `
      <section class="section-wrap">
        <h2>Unable to load resume</h2>
        <p>${escapeHtml(error.message)}</p>
      </section>
    `;
  });
