function getPageConfig() {
  const { body } = document;

  return {
    resumeSrc: body.dataset.resumeSrc || 'resume.json',
    documentType: body.dataset.documentType || 'resume',
    template: body.dataset.resumeTemplate || 'modern',
    pageTitle: body.dataset.pageTitle || document.title,
    brand: body.dataset.brand || '',
    brandSubtitle: body.dataset.brandSubtitle || ''
  };
}

async function loadResume(resumeSrc) {
  const response = await fetch(resumeSrc);
  if (!response.ok) throw new Error('Unable to load resume data.');
  return response.json();
}

function getStorageKey(config) {
  return `portfolio-${config.documentType}-${config.resumeSrc}`;
}

function loadStoredData(config) {
  try {
    const raw = localStorage.getItem(getStorageKey(config));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveStoredData(config, data) {
  try {
    localStorage.setItem(getStorageKey(config), JSON.stringify(data));
  } catch (error) {
    // Ignore storage failures (private mode / restricted contexts).
  }
}

function clearStoredData(config) {
  try {
    localStorage.removeItem(getStorageKey(config));
  } catch (error) {
    // Ignore storage failures (private mode / restricted contexts).
  }
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
  const sectionTitles = data.sectionTitles || {};
  const address = data.address || basics.address || '';
  const summaryLabel = sectionTitles.summary || 'Professional Summary';
  const skillsLabel = sectionTitles.skills || 'Core Skills';
  const workLabel = sectionTitles.work || 'Professional Experience';
  const educationLabel = sectionTitles.education || 'Education';
  const volunteerLabel = sectionTitles.volunteer || 'Volunteer Work';

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
    template: data.template || 'modern',
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
    address,
    image: basics.image || data.image || data.images?.profile || '',
    summary: basics.summary || data.summary || '',
    sectionTitles: {
      summary: summaryLabel,
      skills: skillsLabel,
      work: workLabel,
      education: educationLabel,
      volunteer: volunteerLabel
    },
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

function formatLongDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function normalizeCoverLetterData(data) {
  const recipient = data.recipient || {};
  const recipientAddress = Array.isArray(recipient.addressLines)
    ? recipient.addressLines.filter(Boolean)
    : [];

  return {
    name: data.name || 'Your Name',
    headline: data.title || 'Professional',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
    location: data.location || '',
    image: data.image || data.images?.profile || '',
    recipientName: recipient.name || 'Hiring Manager',
    recipientCompany: recipient.company || '',
    recipientAddress,
    greeting: data.greeting || 'Dear Hiring Manager,',
    opening: data.opening || '',
    body: Array.isArray(data.body) ? data.body.filter(Boolean) : [],
    closing: data.closing || '',
    signature: data.signature || 'Sincerely,'
  };
}

function coverLetterToEditableFields(data) {
  const letter = normalizeCoverLetterData(data);

  return {
    recipientName: letter.recipientName,
    recipientCompany: letter.recipientCompany,
    recipientAddress: letter.recipientAddress.join('\n'),
    greeting: letter.greeting,
    opening: letter.opening,
    bodyParagraph1: letter.body[0] || '',
    bodyParagraph2: letter.body[1] || '',
    bodyParagraph3: letter.body[2] || '',
    closing: letter.closing,
    signature: letter.signature
  };
}

function editableFieldsToCoverLetter(fields, baseData) {
  const recipientAddress = String(fields.recipientAddress || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const body = [fields.bodyParagraph1, fields.bodyParagraph2, fields.bodyParagraph3]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  return {
    ...baseData,
    recipient: {
      ...(baseData.recipient || {}),
      name: String(fields.recipientName || '').trim(),
      company: String(fields.recipientCompany || '').trim(),
      addressLines: recipientAddress
    },
    greeting: String(fields.greeting || '').trim(),
    opening: String(fields.opening || '').trim(),
    body,
    closing: String(fields.closing || '').trim(),
    signature: String(fields.signature || '').trim()
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

function flattenSkills(groups) {
  return groups.flatMap(group => group.keywords || []);
}

function renderSectionHeading(title) {
  return `
    <div class="classic-section-title" aria-hidden="true">
      <span class="classic-rule"></span>
      <h2>${escapeHtml(title)}</h2>
      <span class="classic-rule"></span>
    </div>
  `;
}

function renderClassicExperience(items) {
  return items
    .map(
      item => `
        <article class="classic-job">
          <div class="classic-job-heading">
            <h3>
              <span class="classic-company">${escapeHtml(item.company)}</span>
              <span class="classic-separator"> | </span>
              <span class="classic-position">${escapeHtml(item.position)}</span>
            </h3>
            <div class="classic-job-meta">
              ${item.location ? `<span>${escapeHtml(item.location)}</span>` : ''}
              ${
                item.dateLabel || item.startDate || item.endDate
                  ? `<span>${escapeHtml(item.dateLabel || formatDateRange(item.startDate, item.endDate))}</span>`
                  : ''
              }
            </div>
          </div>
          ${
            item.highlights?.length
              ? `<ul class="classic-bullets">${item.highlights
                  .map(bullet => `<li>${escapeHtml(bullet)}</li>`)
                  .join('')}</ul>`
              : ''
          }
        </article>
      `
    )
    .join('');
}

function renderClassicResume(resume) {
  const skillList = flattenSkills(resume.skillGroups);

  return `
    <section class="classic-resume">
      <header class="classic-header">
        <h1>${escapeHtml(resume.name)}</h1>
        <div class="classic-contact">
          ${resume.address ? `<span>${escapeHtml(resume.address)}</span>` : ''}
          ${resume.phone ? `<span>${escapeHtml(resume.phone)}</span>` : ''}
          ${resume.email ? `<a href="mailto:${escapeHtml(resume.email)}">${escapeHtml(resume.email)}</a>` : ''}
        </div>
      </header>

      <section class="classic-section">
        ${renderSectionHeading(resume.sectionTitles.summary)}
        <p class="classic-summary">${escapeHtml(resume.summary)}</p>
      </section>

      ${
        skillList.length
          ? `
            <section class="classic-section">
              ${renderSectionHeading(resume.sectionTitles.skills)}
              <div class="classic-skills">
                ${skillList
                  .map(skill => `<div class="classic-skill-item">${escapeHtml(skill)}</div>`)
                  .join('')}
              </div>
            </section>
          `
          : ''
      }

      ${
        resume.work.length
          ? `
            <section class="classic-section">
              ${renderSectionHeading(resume.sectionTitles.work)}
              <div class="classic-experience">
                ${renderClassicExperience(resume.work)}
              </div>
            </section>
          `
          : ''
      }

      ${
        resume.education.length
          ? `
            <section class="classic-section">
              ${renderSectionHeading(resume.sectionTitles.education)}
              <div class="classic-simple-list">
                ${resume.education
                  .map(
                    item => `
                      <article class="classic-simple-entry">
                        <h3>${escapeHtml(item.area)}</h3>
                        ${
                          item.institution || item.location
                            ? `<div class="classic-education-school">${escapeHtml(
                                [item.institution, item.location].filter(Boolean).join(' | ')
                              )}</div>`
                            : ''
                        }
                        ${item.endDate ? `<div class="classic-education-date">${escapeHtml(formatDate(item.endDate))}</div>` : ''}
                      </article>
                    `
                  )
                  .join('')}
              </div>
            </section>
          `
          : ''
      }
    </section>
  `;
}

function renderCoverLetter(data) {
  const letter = normalizeCoverLetterData(data);
  const initials = getInitials(letter.name);

  return `
    <section class="letter-shell">
      <section class="letter-hero">
        <div>
          <p class="eyebrow">Cover Letter</p>
          <h1>${escapeHtml(letter.name)}</h1>
          <p class="hero-role">${escapeHtml(letter.headline)}</p>
        </div>
        <aside class="letter-contact-card">
          <div class="profile-photo" aria-label="Profile photo">
            ${
              letter.image
                ? `<img src="${escapeHtml(letter.image)}" alt="${escapeHtml(letter.name)}" loading="eager" />`
                : `<span>${escapeHtml(initials)}</span>`
            }
          </div>
          <ul class="hero-links">
            ${letter.email ? `<li><a href="mailto:${escapeHtml(letter.email)}"><i class="fa-solid fa-envelope"></i>${escapeHtml(letter.email)}</a></li>` : ''}
            ${letter.phone ? `<li><a href="tel:${escapeHtml(letter.phone.replace(/[^\d+]/g, ''))}"><i class="fa-solid fa-phone"></i>${escapeHtml(letter.phone)}</a></li>` : ''}
            ${letter.linkedin ? `<li><a href="${escapeHtml(letter.linkedin)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin"></i>LinkedIn Profile</a></li>` : ''}
            ${letter.location ? `<li><span><i class="fa-solid fa-location-dot"></i>${escapeHtml(letter.location)}</span></li>` : ''}
          </ul>
        </aside>
      </section>

      <section class="letter-body">
        <div class="letter-meta">
          <div>
            <p class="letter-date">${escapeHtml(formatLongDate())}</p>
            <div class="letter-recipient">
              <p>${escapeHtml(letter.recipientName)}</p>
              ${letter.recipientCompany ? `<p>${escapeHtml(letter.recipientCompany)}</p>` : ''}
              ${letter.recipientAddress.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
            </div>
          </div>
        </div>

        <article class="letter-content">
          <p>${escapeHtml(letter.greeting)}</p>
          ${letter.opening ? `<p>${escapeHtml(letter.opening)}</p>` : ''}
          ${letter.body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          ${letter.closing ? `<p>${escapeHtml(letter.closing)}</p>` : ''}
          <div class="letter-signoff">
            <p>${escapeHtml(letter.signature)}</p>
            <p class="letter-name">${escapeHtml(letter.name)}</p>
          </div>
        </article>
      </section>
    </section>
  `;
}

function renderClassicCoverLetter(data) {
  const letter = normalizeCoverLetterData(data);

  return `
    <section class="classic-cover-letter">
      <header class="classic-letter-header">
        <h1>${escapeHtml(letter.name)}</h1>
        <div class="classic-letter-contact">
          ${letter.address ? `<span>${escapeHtml(letter.address)}</span>` : ''}
          ${letter.phone ? `<span>${escapeHtml(letter.phone)}</span>` : ''}
          ${letter.email ? `<a href="mailto:${escapeHtml(letter.email)}">${escapeHtml(letter.email)}</a>` : ''}
        </div>
      </header>

      <section class="classic-letter-body">
        <p class="classic-letter-date">${escapeHtml(formatLongDate())}</p>

        <div class="classic-letter-recipient">
          ${letter.recipientName ? `<p>${escapeHtml(letter.recipientName)}</p>` : ''}
          ${letter.recipientCompany ? `<p>${escapeHtml(letter.recipientCompany)}</p>` : ''}
          ${letter.recipientAddress.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
          <p>${escapeHtml(letter.greeting)}</p>
        </div>

        <article class="classic-letter-content">
          ${letter.opening ? `<p>${escapeHtml(letter.opening)}</p>` : ''}
          ${letter.body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          ${letter.closing ? `<p>${escapeHtml(letter.closing)}</p>` : ''}
        </article>

        <div class="classic-letter-signoff">
          <p>${escapeHtml(letter.signature)}</p>
          <p>${escapeHtml(letter.name)}</p>
        </div>
      </section>
    </section>
  `;
}

function renderCoverLetterEditor(fields) {
  return `
    <div class="modal-backdrop" id="coverLetterModal" aria-hidden="true">
      <section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="coverLetterModalTitle">
        <div class="modal-header">
          <div>
            <p class="modal-eyebrow">Cover Letter Editor</p>
            <h2 id="coverLetterModalTitle">Edit letter content</h2>
          </div>
          <button class="icon-btn" type="button" data-modal-close aria-label="Close editor">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form id="coverLetterForm" class="modal-form">
          <label class="field">
            <span>Recipient Name</span>
            <input name="recipientName" type="text" value="${escapeHtml(fields.recipientName)}" />
          </label>
          <label class="field">
            <span>Company</span>
            <input name="recipientCompany" type="text" value="${escapeHtml(fields.recipientCompany)}" />
          </label>
          <label class="field field-full">
            <span>Company Address</span>
            <textarea name="recipientAddress" rows="3">${escapeHtml(fields.recipientAddress)}</textarea>
          </label>
          <label class="field field-full">
            <span>Greeting</span>
            <input name="greeting" type="text" value="${escapeHtml(fields.greeting)}" />
          </label>
          <label class="field field-full">
            <span>Opening Paragraph</span>
            <textarea name="opening" rows="4">${escapeHtml(fields.opening)}</textarea>
          </label>
          <label class="field field-full">
            <span>Body Paragraph 1</span>
            <textarea name="bodyParagraph1" rows="4">${escapeHtml(fields.bodyParagraph1)}</textarea>
          </label>
          <label class="field field-full">
            <span>Body Paragraph 2</span>
            <textarea name="bodyParagraph2" rows="4">${escapeHtml(fields.bodyParagraph2)}</textarea>
          </label>
          <label class="field field-full">
            <span>Body Paragraph 3</span>
            <textarea name="bodyParagraph3" rows="4">${escapeHtml(fields.bodyParagraph3)}</textarea>
          </label>
          <label class="field field-full">
            <span>Closing Paragraph</span>
            <textarea name="closing" rows="3">${escapeHtml(fields.closing)}</textarea>
          </label>
          <label class="field">
            <span>Sign-Off</span>
            <input name="signature" type="text" value="${escapeHtml(fields.signature)}" />
          </label>
          <div class="modal-actions">
            <button class="btn btn-quiet" type="button" id="resetLetterBtn">Reset</button>
            <button class="btn btn-quiet" type="button" data-modal-close>Cancel</button>
            <button class="btn" type="submit">Save Changes</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderModernResume(resume) {
  const initials = getInitials(resume.name);

  return `
    <section class="hero">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Professional Resume</p>
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

function renderResume(data, config) {
  if (config.documentType === 'cover-letter') {
    document.title = config.pageTitle || 'Cover Letter';

    const brand = document.querySelector('.brand');
    const brandSub = document.querySelector('.brand-sub');
    const root = document.getElementById('resumeRoot');

    if (brand) brand.textContent = config.brand || data.name || 'Cover Letter';
    if (brandSub) brandSub.textContent = config.brandSubtitle || 'Cover Letter';

    root.innerHTML =
      config.template === 'classic'
        ? renderClassicCoverLetter(data)
        : renderCoverLetter(data);
    return;
  }

  const resume = normalizeResumeData(data);
  const root = document.getElementById('resumeRoot');
  const template = config.template || resume.template || 'modern';

  document.title = config.pageTitle || `${resume.name} | Professional Resume`;

  const brand = document.querySelector('.brand');
  const brandSub = document.querySelector('.brand-sub');

  if (brand) brand.textContent = config.brand || resume.name;
  if (brandSub) brandSub.textContent = config.brandSubtitle || 'Professional Resume';

  root.innerHTML =
    template === 'classic'
      ? renderClassicResume(resume)
      : renderModernResume(resume);
}

function initCoverLetterEditor(config, sourceData, activeData) {
  if (config.documentType !== 'cover-letter') return;

  const trigger = document.getElementById('editLetterBtn');
  const root = document.getElementById('resumeRoot');
  if (!trigger || !root) return;

  const initialData = structuredClone ? structuredClone(sourceData) : JSON.parse(JSON.stringify(sourceData));
  let currentData = structuredClone ? structuredClone(activeData) : JSON.parse(JSON.stringify(activeData));

  const renderCurrentLetter = () => {
    renderResume(currentData, config);
  };

  let isModalOpen = false;

  function closeModal() {
    const modal = document.getElementById('coverLetterModal');
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    isModalOpen = false;
  }

  const ensureModal = () => {
    let modal = document.getElementById('coverLetterModal');
    if (modal) return modal;

    document.body.insertAdjacentHTML('beforeend', renderCoverLetterEditor(coverLetterToEditableFields(currentData)));
    modal = document.getElementById('coverLetterModal');
    const form = document.getElementById('coverLetterForm');
    const resetBtn = document.getElementById('resetLetterBtn');

    modal.addEventListener('click', event => {
      if (event.target === modal) {
        closeModal();
      }
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const formData = new FormData(form);
      const fields = Object.fromEntries(formData.entries());

      currentData = editableFieldsToCoverLetter(fields, currentData);
      saveStoredData(config, currentData);
      renderCurrentLetter();
      closeModal();
    });

    resetBtn.addEventListener('click', () => {
      currentData = structuredClone ? structuredClone(initialData) : JSON.parse(JSON.stringify(initialData));
      clearStoredData(config);
      renderCurrentLetter();
      syncForm();
      closeModal();
    });

    return modal;
  };

  const syncForm = () => {
    const form = document.getElementById('coverLetterForm');
    if (!form) return;

    const fields = coverLetterToEditableFields(currentData);
    Object.entries(fields).forEach(([key, value]) => {
      const control = form.elements.namedItem(key);
      if (control) control.value = value;
    });
  };

  const openModal = () => {
    const modal = ensureModal();
    syncForm();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    isModalOpen = true;
    const firstInput = document.querySelector('#coverLetterForm input, #coverLetterForm textarea');
    if (firstInput) firstInput.focus();
  };

  trigger.addEventListener('click', openModal);

  document.addEventListener('click', event => {
    if (!isModalOpen) return;

    if (event.target.closest('[data-modal-close]')) {
      event.preventDefault();
      closeModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
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

const pageConfig = getPageConfig();

loadResume(pageConfig.resumeSrc)
  .then(data => {
    const storedData = loadStoredData(pageConfig);
    const activeData = storedData || data;

    renderResume(activeData, pageConfig);
    initCoverLetterEditor(pageConfig, data, activeData);
  })
  .catch(error => {
    document.getElementById('resumeRoot').innerHTML = `
      <section class="section-wrap">
        <h2>Unable to load resume</h2>
        <p>${escapeHtml(error.message)}</p>
      </section>
    `;
  });
