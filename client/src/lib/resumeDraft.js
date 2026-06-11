const blankExperience = {
  role: '',
  company: '',
  location: '',
  dates: '',
  bulletsText: ''
};

const blankSkillGroup = {
  name: 'Core Skills',
  keywordsText: ''
};

function toLines(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('\n');
  }

  return String(value || '');
}

function fromLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizeSkillDraft(skills) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return [{ ...blankSkillGroup }];
  }

  if (skills.every(skill => typeof skill === 'string')) {
    return [{ name: 'Core Skills', keywordsText: toLines(skills) }];
  }

  return skills.map(group => ({
    name: group?.name || 'Core Skills',
    keywordsText: toLines(group?.keywords)
  }));
}

export function createResumeDraft(data = {}) {
  return {
    template: data.template || 'modern',
    basics: {
      name: data.name || data.basics?.name || '',
      title: data.title || data.basics?.headline || '',
      location: data.location || '',
      address: data.address || '',
      phone: data.phone || data.basics?.phone || '',
      email: data.email || data.basics?.email || '',
      linkedin: data.linkedin || '',
      image: data.image || data.images?.profile || ''
    },
    sectionTitles: {
      summary: data.sectionTitles?.summary || 'Professional Summary',
      strengths: data.sectionTitles?.strengths || 'Selected Strengths',
      skills: data.sectionTitles?.skills || 'Core Skills',
      work: data.sectionTitles?.work || 'Professional Experience',
      education: data.sectionTitles?.education || 'Education',
      volunteer: data.sectionTitles?.volunteer || 'Volunteer Work'
    },
    summary: data.summary || data.basics?.summary || '',
    selectedStrengthsText: toLines(data.selectedStrengths),
    skills: normalizeSkillDraft(data.skills),
    experience: Array.isArray(data.experience)
      ? data.experience.map(item => ({
          role: item.role || item.position || '',
          company: item.company || '',
          location: item.location || '',
          dates: item.dates || item.dateLabel || '',
          bulletsText: toLines(item.bullets || item.highlights)
        }))
      : [{ ...blankExperience }],
    education: Array.isArray(data.education)
      ? data.education.map(item => ({
          credential: item.credential || item.area || '',
          school: item.school || item.institution || '',
          location: item.location || '',
          dates: item.dates || item.endDate || ''
        }))
      : []
  };
}

export function resumeDraftToJson(draft) {
  const basics = draft.basics || {};
  const image = basics.image || '';

  return {
    template: draft.template || 'modern',
    name: basics.name || '',
    title: basics.title || '',
    ...(basics.location ? { location: basics.location } : {}),
    ...(basics.address ? { address: basics.address } : {}),
    phone: basics.phone || '',
    email: basics.email || '',
    ...(basics.linkedin ? { linkedin: basics.linkedin } : {}),
    ...(image ? { image, images: { profile: image } } : {}),
    sectionTitles: draft.sectionTitles || {},
    summary: draft.summary || '',
    selectedStrengths: fromLines(draft.selectedStrengthsText),
    skills: (draft.skills || [])
      .map(group => ({
        name: group.name || 'Core Skills',
        keywords: fromLines(group.keywordsText)
      }))
      .filter(group => group.keywords.length > 0),
    experience: (draft.experience || [])
      .map(item => ({
        role: item.role || '',
        company: item.company || '',
        location: item.location || '',
        dates: item.dates || '',
        bullets: fromLines(item.bulletsText)
      }))
      .filter(item => item.role || item.company || item.bullets.length > 0),
    education: (draft.education || [])
      .map(item => ({
        credential: item.credential || '',
        school: item.school || '',
        location: item.location || '',
        dates: item.dates || ''
      }))
      .filter(item => item.credential || item.school)
  };
}

export function addExperienceItem(draft) {
  return {
    ...draft,
    experience: [...(draft.experience || []), { ...blankExperience }]
  };
}

export function addSkillGroup(draft) {
  return {
    ...draft,
    skills: [...(draft.skills || []), { ...blankSkillGroup }]
  };
}

export function removeArrayItem(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

