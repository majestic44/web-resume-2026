export const profiles = {
  jareth: {
    slug: 'jareth',
    name: 'Jareth Thomas',
    label: 'Operations & Logistics',
    template: 'modern',
    seedFile: 'jareth-resume.json',
    resumeLink: '/resume/jareth',
    coverLetterLink: '/cover-letter/jareth'
  },
  angel: {
    slug: 'angel',
    name: 'Angel Cunningham',
    label: 'Professional Profile',
    template: 'classic',
    seedFile: 'angel-resume.json',
    resumeLink: '/resume/angel',
    coverLetterLink: '/cover-letter/angel'
  }
};

export const coverLetters = {
  jareth: {
    slug: 'jareth',
    name: 'Jareth Thomas',
    template: 'modern',
    seedFile: 'jareth-cover-letter.json',
    backLink: '/resume/jareth'
  },
  angel: {
    slug: 'angel',
    name: 'Angel Cunningham',
    template: 'classic',
    seedFile: 'angel-cover-letter.json',
    backLink: '/resume/angel'
  }
};

export function listProfiles() {
  return Object.values(profiles).map(({ seedFile, ...profile }) => profile);
}

export function publicDocumentMeta(meta) {
  const { seedFile, ...publicMeta } = meta;

  return publicMeta;
}
