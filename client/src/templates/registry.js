import { ClassicCoverLetter } from './cover-letter/ClassicCoverLetter.jsx';
import { ModernCoverLetter } from './cover-letter/ModernCoverLetter.jsx';
import { ClassicResume } from './resume/ClassicResume.jsx';
import { ModernResume } from './resume/ModernResume.jsx';

export const templateRegistry = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Visual layout with profile image, grouped skill cards, and stronger section framing.',
    ResumeComponent: ModernResume,
    CoverLetterComponent: ModernCoverLetter
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Print-first layout with restrained typography, rules, and a more traditional resume flow.',
    ResumeComponent: ClassicResume,
    CoverLetterComponent: ClassicCoverLetter
  }
];

export const templateOptions = templateRegistry.map(({ id, name, description }) => ({
  id,
  name,
  description
}));

export function getTemplateDefinition(templateId) {
  return templateRegistry.find(template => template.id === templateId) || templateRegistry[0];
}
