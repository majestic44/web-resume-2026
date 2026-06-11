export function normalizeResumeData(data) {
  const basics = data.basics || {};
  const locationParts = [basics.location?.city, basics.location?.region, basics.location?.country].filter(Boolean);

  const normalizeSkillGroups = inputSkills => {
    if (!Array.isArray(inputSkills) || inputSkills.length === 0) return [];

    if (inputSkills.every(item => typeof item === 'string')) {
      return [{ name: 'Core Skills', keywords: [...new Set(inputSkills.filter(Boolean))] }];
    }

    return inputSkills
      .map(item => {
        const keywords = Array.isArray(item?.keywords) ? [...new Set(item.keywords.filter(Boolean))] : [];
        return keywords.length ? { name: item.name || 'Core Skills', keywords } : null;
      })
      .filter(Boolean);
  };

  return {
    template: data.template || 'modern',
    name: basics.name || data.name || 'Your Name',
    headline: basics.headline || data.title || 'Professional',
    email: basics.email || data.email || '',
    phone: basics.phone || data.phone || '',
    linkedin: basics.linkedin || data.linkedin || '',
    location: locationParts.join(', ') || data.location || '',
    address: data.address || basics.address || '',
    image: basics.image || data.image || data.images?.profile || '',
    summary: basics.summary || data.summary || '',
    sectionTitles: {
      summary: data.sectionTitles?.summary || 'Professional Summary',
      strengths: data.sectionTitles?.strengths || 'Selected Strengths',
      skills: data.sectionTitles?.skills || 'Core Skills',
      work: data.sectionTitles?.work || 'Professional Experience',
      education: data.sectionTitles?.education || 'Education',
      volunteer: data.sectionTitles?.volunteer || 'Volunteer Work'
    },
    selectedStrengths: Array.isArray(data.selectedStrengths) ? data.selectedStrengths.filter(Boolean) : [],
    skillGroups: normalizeSkillGroups(data.skills),
    work: Array.isArray(data.work)
      ? data.work
      : Array.isArray(data.experience)
        ? data.experience.map(item => ({
            position: item.role || '',
            company: item.company || '',
            location: item.location || '',
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
          organization: item.organization || item.company || '',
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

export function normalizeCoverLetterData(data) {
  return {
    template: data.template || 'modern',
    name: data.name || 'Your Name',
    headline: data.title || 'Professional',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
    location: data.location || '',
    image: data.image || data.images?.profile || '',
    recipientName: data.recipient?.name || 'Hiring Manager',
    recipientCompany: data.recipient?.company || '',
    recipientAddress: Array.isArray(data.recipient?.addressLines) ? data.recipient.addressLines.filter(Boolean) : [],
    greeting: data.greeting || 'Dear Hiring Manager,',
    opening: data.opening || '',
    body: Array.isArray(data.body) ? data.body.filter(Boolean) : [],
    closing: data.closing || '',
    signature: data.signature || 'Sincerely,'
  };
}

export function formatLongDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}
