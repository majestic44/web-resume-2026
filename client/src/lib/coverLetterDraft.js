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

function blankRecipient() {
  return {
    name: 'Hiring Manager',
    company: '',
    addressLinesText: ''
  };
}

function blankParagraph() {
  return {
    text: ''
  };
}

export function createCoverLetterDraft(data = {}) {
  return {
    template: data.template || 'modern',
    basics: {
      name: data.name || '',
      title: data.title || '',
      location: data.location || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      linkedin: data.linkedin || '',
      image: data.image || data.images?.profile || ''
    },
    recipient: {
      name: data.recipient?.name || 'Hiring Manager',
      company: data.recipient?.company || '',
      addressLinesText: toLines(data.recipient?.addressLines)
    },
    greeting: data.greeting || 'Dear Hiring Manager,',
    opening: data.opening || '',
    body: Array.isArray(data.body) && data.body.length > 0
      ? data.body.map(text => ({ text: String(text || '') }))
      : [blankParagraph()],
    closing: data.closing || '',
    signature: data.signature || 'Sincerely,'
  };
}

export function coverLetterDraftToJson(draft) {
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
    recipient: {
      name: draft.recipient?.name || 'Hiring Manager',
      ...(draft.recipient?.company ? { company: draft.recipient.company } : {}),
      addressLines: fromLines(draft.recipient?.addressLinesText)
    },
    greeting: draft.greeting || 'Dear Hiring Manager,',
    opening: draft.opening || '',
    body: (draft.body || [])
      .map(item => String(item?.text || '').trim())
      .filter(Boolean),
    closing: draft.closing || '',
    signature: draft.signature || 'Sincerely,'
  };
}

export function addBodyParagraph(draft) {
  return {
    ...draft,
    body: [...(draft.body || []), blankParagraph()]
  };
}

export function removeArrayItem(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export { blankParagraph, blankRecipient };
