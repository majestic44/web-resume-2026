import { Button, Card, Chip, Input, Label, TextArea, TextField } from '@heroui/react';
import { Eye, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { addBodyParagraph, coverLetterDraftToJson, createCoverLetterDraft, removeArrayItem as removeCoverLetterArrayItem } from '../lib/coverLetterDraft.js';
import {
  addExperienceItem,
  addSkillGroup,
  createResumeDraft,
  removeArrayItem as removeResumeArrayItem,
  resumeDraftToJson
} from '../lib/resumeDraft.js';
import { templateOptions } from '../templates/registry.js';

const documentTypeOptions = [
  { id: 'resume', label: 'Resume' },
  { id: 'cover-letter', label: 'Cover Letter' }
];

const editorSections = {
  resume: [
    { id: 'basics', label: 'Basics' },
    { id: 'summary', label: 'Summary' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'json', label: 'JSON Preview' }
  ],
  'cover-letter': [
    { id: 'basics', label: 'Basics' },
    { id: 'recipient', label: 'Recipient' },
    { id: 'content', label: 'Content' },
    { id: 'json', label: 'JSON Preview' }
  ]
};

function updateNestedValue(source, path, value) {
  const [group, key] = path;

  return {
    ...source,
    [group]: {
      ...source[group],
      [key]: value
    }
  };
}

function updateArrayItem(items, index, patch) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function createDraftForType(type, data = {}) {
  return type === 'cover-letter' ? createCoverLetterDraft(data) : createResumeDraft(data);
}

function draftToJsonForType(type, draft) {
  return type === 'cover-letter' ? coverLetterDraftToJson(draft) : resumeDraftToJson(draft);
}

function documentPreviewPath(type, slug) {
  return type === 'cover-letter' ? `/cover-letter/${slug}` : `/resume/${slug}`;
}

function documentTypeTitle(type) {
  return type === 'cover-letter' ? 'cover letter' : 'resume';
}

function documentTypeHeadline(type) {
  return type === 'cover-letter' ? 'Cover letter editor' : 'Resume editor';
}

function documentCountSummary(type, json) {
  if (type === 'cover-letter') {
    return [
      { label: 'Paragraphs', value: json?.body?.length || 0 },
      { label: 'Recipient Lines', value: json?.recipient?.addressLines?.length || 0 },
      { label: 'Template', value: json?.template || 'modern' }
    ];
  }

  return [
    { label: 'Skills', value: json?.skills?.reduce((total, group) => total + group.keywords.length, 0) || 0 },
    { label: 'Experience', value: json?.experience?.length || 0 },
    { label: 'Education', value: json?.education?.length || 0 }
  ];
}

export function Editor({ authState }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('jareth');
  const [selectedDocumentType, setSelectedDocumentType] = useState('resume');
  const [activeSection, setActiveSection] = useState('basics');
  const [sourceDocument, setSourceDocument] = useState(null);
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [publishState, setPublishState] = useState('idle');
  const [savedJsonText, setSavedJsonText] = useState('{}');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  useEffect(() => {
    fetch('/api/profiles')
      .then(response => response.json())
      .then(data => {
        const nextProfiles = data.profiles || [];
        setProfiles(nextProfiles);
        if (nextProfiles.length > 0) {
          setSelectedSlug(current => current || nextProfiles[0].slug);
        }
      })
      .catch(() => setError('Unable to load profile list.'));
  }, []);

  useEffect(() => {
    const sections = editorSections[selectedDocumentType] || editorSections.resume;
    if (!sections.some(section => section.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [selectedDocumentType, activeSection]);

  useEffect(() => {
    if (!selectedSlug) return;

    setStatus('loading');
    setError('');

    fetch(`/api/documents/${selectedDocumentType}/${selectedSlug}`)
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load ${documentTypeTitle(selectedDocumentType)} document.`);
        return response.json();
      })
      .then(async document => {
        const draftResponse = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}`);
        const draftPayload = draftResponse.ok ? await draftResponse.json() : { draft: null, history: [] };
        const sourceContent = {
          ...document.content,
          template: document.meta?.template || document.content?.template || 'modern'
        };
        const startingContent = {
          ...sourceContent,
          ...(draftPayload.draft?.content || {})
        };

        setSourceDocument({ ...document, content: sourceContent });
        setDraft(createDraftForType(selectedDocumentType, startingContent));
        setHistory(draftPayload.history || []);
        setSavedJsonText(JSON.stringify(startingContent, null, 2));
        setHasSavedDraft(Boolean(draftPayload.draft));
        setStatusMessage(
          draftPayload.draft
            ? `Loaded saved draft from ${formatTimestamp(draftPayload.draft.savedAt)}`
            : `Loaded source ${documentTypeTitle(selectedDocumentType)}`
        );
        setSaveState('idle');
        setPublishState('idle');
        setStatus('ready');
      })
      .catch(fetchError => {
        setError(fetchError.message);
        setStatus('error');
      });
  }, [selectedSlug, selectedDocumentType]);

  const generatedJson = useMemo(
    () => (draft ? draftToJsonForType(selectedDocumentType, draft) : null),
    [draft, selectedDocumentType]
  );
  const generatedJsonText = useMemo(() => JSON.stringify(generatedJson || {}, null, 2), [generatedJson]);

  const editableProfiles = useMemo(() => {
    if (authState.dataSource !== 'database' || !authState.user) {
      return profiles;
    }

    if (authState.user.editableProfiles?.includes('*')) {
      return profiles;
    }

    return profiles.filter(profile => authState.user.editableProfiles?.includes(profile.slug));
  }, [authState, profiles]);

  useEffect(() => {
    if (!editableProfiles.length) return;
    if (!editableProfiles.some(profile => profile.slug === selectedSlug)) {
      setSelectedSlug(editableProfiles[0].slug);
    }
  }, [editableProfiles, selectedSlug]);

  const selectedProfile = profiles.find(profile => profile.slug === selectedSlug);
  const isDirty = Boolean(sourceDocument && generatedJsonText !== savedJsonText);
  const canEditSelectedProfile = authState.dataSource !== 'database'
    || (authState.user && editableProfiles.some(profile => profile.slug === selectedSlug));
  const canPublishDraft = authState.dataSource === 'database'
    && hasSavedDraft
    && canEditSelectedProfile
    && Boolean(authState.user);
  const sections = editorSections[selectedDocumentType] || editorSections.resume;
  const summaryItems = documentCountSummary(selectedDocumentType, generatedJson);

  const updateDraft = updater => {
    setDraft(current => (typeof updater === 'function' ? updater(current) : updater));
  };

  const updateBasics = (key, value) => updateDraft(current => updateNestedValue(current, ['basics', key], value));
  const updateSectionTitle = (key, value) => updateDraft(current => updateNestedValue(current, ['sectionTitles', key], value));

  const resetDraft = async () => {
    if (!sourceDocument) return;

    setSaveState('saving');
    setPublishState('idle');
    setError('');

    try {
      const response = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        throw new Error('Unable to reset saved draft.');
      }

      setDraft(createDraftForType(selectedDocumentType, sourceDocument.content));
      setSavedJsonText(JSON.stringify(sourceDocument.content, null, 2));
      setHasSavedDraft(false);
      setStatusMessage(`Draft reset to source ${documentTypeTitle(selectedDocumentType)}`);
      setSaveState('idle');

      const draftResponse = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}`);
      const draftPayload = draftResponse.ok ? await draftResponse.json() : { history: [] };
      setHistory(draftPayload.history || []);
    } catch (resetError) {
      setError(resetError.message);
      setSaveState('error');
    }
  };

  const saveDraft = async (options = {}) => {
    if (!generatedJson) return;

    setSaveState('saving');
    if (!options.silent) {
      setPublishState('idle');
    }
    setError('');

    try {
      const response = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedJson })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save draft.');
      }

      setSavedJsonText(JSON.stringify(payload.draft.content, null, 2));
      setHistory(payload.history || []);
      setHasSavedDraft(true);
      if (!options.silent) {
        setStatusMessage(`Draft saved at ${formatTimestamp(payload.draft.savedAt)}`);
      }
      setSaveState('saved');
      return payload;
    } catch (saveError) {
      setError(saveError.message);
      setSaveState('error');
      throw saveError;
    }
  };

  const publishDraft = async () => {
    if (!generatedJson || !selectedSlug) return;

    setPublishState('publishing');
    setError('');

    try {
      if (isDirty) {
        await saveDraft({ silent: true });
      }

      const response = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}/publish`, {
        method: 'POST'
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to publish draft.');
      }

      const liveContent = {
        ...payload.document.content,
        template: payload.document.meta?.template || payload.document.content?.template || draft?.template || 'modern'
      };

      setSourceDocument({ ...payload.document, content: liveContent });
      setDraft(createDraftForType(selectedDocumentType, liveContent));
      setSavedJsonText(JSON.stringify(liveContent, null, 2));
      setHistory(payload.history || []);
      setHasSavedDraft(false);
      setStatusMessage(`Published live ${documentTypeTitle(selectedDocumentType)} at ${formatTimestamp(payload.document.meta?.updatedAt || payload.publishedAt)}`);
      setSaveState('idle');
      setPublishState('published');
    } catch (publishError) {
      setError(publishError.message);
      setPublishState('error');
    }
  };

  return (
    <>
      <PageHeader eyebrow="Editor Draft" title={documentTypeHeadline(selectedDocumentType)}>
        <p>
          {authState.dataSource === 'database'
            ? authState.user
              ? `Edits save to protected draft history for the signed-in account before you publish the live ${documentTypeTitle(selectedDocumentType)}.`
              : 'Database mode requires sign-in before draft changes can be saved.'
            : `Edits save to local server draft files in seed mode so we can keep moving before full account setup.`}
        </p>
      </PageHeader>

      <section className="editor-topbar" aria-label="Editor controls">
        <div className="editor-topbar__fields">
          <label className="select-field">
            <span>Profile</span>
            <select value={selectedSlug} onChange={event => setSelectedSlug(event.target.value)}>
              {editableProfiles.map(profile => <option key={profile.slug} value={profile.slug}>{profile.name}</option>)}
            </select>
          </label>
          <label className="select-field">
            <span>Document</span>
            <select value={selectedDocumentType} onChange={event => setSelectedDocumentType(event.target.value)}>
              {documentTypeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="select-field">
            <span>Template</span>
            <select
              value={draft?.template || selectedProfile?.template || 'modern'}
              onChange={event => updateDraft(current => ({ ...current, template: event.target.value }))}
              disabled={!draft}
            >
              {templateOptions.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
        </div>
        <div className="editor-status">
          <Chip color={isDirty ? 'warning' : 'success'} variant="soft">{isDirty ? 'Unsaved draft' : 'Synced to source'}</Chip>
          {draft?.template ? <Chip variant="flat">{draft.template}</Chip> : selectedProfile ? <Chip variant="flat">{selectedProfile.template}</Chip> : null}
          {statusMessage ? <Chip variant="bordered">{statusMessage}</Chip> : null}
        </div>
      </section>

      {error ? <p className="editor-error">{error}</p> : null}
      {publishState === 'published' ? <p className="editor-success">Live {documentTypeTitle(selectedDocumentType)} updated from the latest draft.</p> : null}
      {authState.dataSource === 'database' && authState.user && !editableProfiles.length ? (
        <p className="editor-error">This account does not have any assigned editable profiles yet.</p>
      ) : null}

      <section className="editor-layout wide">
        <Card>
          <Card.Content className="section-list" aria-label="Editor sections">
            {sections.map(section => (
              <button
                className={activeSection === section.id ? 'active' : ''}
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </Card.Content>
        </Card>

        <Card className="form-panel editor-panel">
          <Card.Content className="form-stack">
            {status === 'loading' || !draft ? (
              <p className="muted">Loading {documentTypeTitle(selectedDocumentType)} draft...</p>
            ) : (
              <>
                {activeSection === 'basics' ? <BasicsSection draft={draft} updateBasics={updateBasics} /> : null}
                {selectedDocumentType === 'resume' && activeSection === 'summary' ? (
                  <SummarySection draft={draft} updateDraft={updateDraft} updateSectionTitle={updateSectionTitle} />
                ) : null}
                {selectedDocumentType === 'resume' && activeSection === 'skills' ? (
                  <SkillsSection draft={draft} updateDraft={updateDraft} />
                ) : null}
                {selectedDocumentType === 'resume' && activeSection === 'experience' ? (
                  <ExperienceSection draft={draft} updateDraft={updateDraft} />
                ) : null}
                {selectedDocumentType === 'resume' && activeSection === 'education' ? (
                  <EducationSection draft={draft} updateDraft={updateDraft} />
                ) : null}
                {selectedDocumentType === 'cover-letter' && activeSection === 'recipient' ? (
                  <RecipientSection draft={draft} updateDraft={updateDraft} />
                ) : null}
                {selectedDocumentType === 'cover-letter' && activeSection === 'content' ? (
                  <CoverLetterContentSection draft={draft} updateDraft={updateDraft} />
                ) : null}
                {activeSection === 'json' ? (
                  <JsonPreview
                    generatedJsonText={generatedJsonText}
                    title={selectedDocumentType === 'cover-letter' ? 'Generated Cover Letter JSON' : 'Generated Resume JSON'}
                    description={selectedDocumentType === 'cover-letter'
                      ? 'This is the cover letter payload that will be saved and published.'
                      : 'This is the resume payload that will be saved and published.'}
                  />
                ) : null}
              </>
            )}
          </Card.Content>
        </Card>

        <Card className="draft-preview">
          <Card.Content className="form-stack">
            <div>
              <p className="card-label">Draft Snapshot</p>
              <h2>{generatedJson?.name || `${documentTypeOptions.find(option => option.id === selectedDocumentType)?.label || 'Document'} Draft`}</h2>
              <p>{generatedJson?.title || 'No headline yet'}</p>
            </div>
            <dl className="snapshot-list">
              {summaryItems.map(item => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className="history-block">
              <p className="card-label">Recent Saves</p>
              {history.length === 0 ? <p className="muted">No saved snapshots yet.</p> : null}
              {history.slice(0, 5).map(entry => (
                <div className="history-row" key={entry.versionId}>
                  <span>{formatTimestamp(entry.savedAt)}</span>
                  <small>{entry.versionId.slice(0, 8)}</small>
                </div>
              ))}
            </div>
            <div className="toolbar compact">
              <Button
                type="button"
                isDisabled={saveState === 'saving' || publishState === 'publishing' || !isDirty || !canEditSelectedProfile || (authState.dataSource === 'database' && !authState.user)}
                onPress={() => saveDraft()}
              >
                <Save size={16} />
                <span>{saveState === 'saving' ? 'Saving...' : 'Save Draft'}</span>
              </Button>
              <Button
                type="button"
                color="primary"
                isDisabled={publishState === 'publishing' || saveState === 'saving' || !canPublishDraft}
                onPress={publishDraft}
              >
                <Send size={16} />
                <span>{publishState === 'publishing' ? 'Publishing...' : 'Publish Live'}</span>
              </Button>
              <Button
                type="button"
                variant="bordered"
                isDisabled={saveState === 'saving' || publishState === 'publishing' || !canEditSelectedProfile || (authState.dataSource === 'database' && !authState.user)}
                onPress={resetDraft}
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </Button>
              <a className="hero-link-button" href={documentPreviewPath(selectedDocumentType, selectedSlug)}>
                <Eye size={16} />
                <span>Public Preview</span>
              </a>
            </div>
          </Card.Content>
        </Card>
      </section>
    </>
  );
}

function BasicsSection({ draft, updateBasics }) {
  return (
    <>
      <EditorSectionHeading title="Basics" description="Primary identity and contact fields for the document header." />
      <p className="field-help">Selected template: {templateOptions.find(template => template.id === draft.template)?.name || 'Modern'}</p>
      <div className="form-grid two">
        <DraftInput label="Display Name" value={draft.basics.name} onChange={value => updateBasics('name', value)} />
        <DraftInput label="Headline" value={draft.basics.title} onChange={value => updateBasics('title', value)} />
        <DraftInput label="Location" value={draft.basics.location} onChange={value => updateBasics('location', value)} />
        <DraftInput label="Address" value={draft.basics.address} onChange={value => updateBasics('address', value)} />
        <DraftInput label="Phone" value={draft.basics.phone} onChange={value => updateBasics('phone', value)} />
        <DraftInput label="Email" value={draft.basics.email} onChange={value => updateBasics('email', value)} />
        <DraftInput label="LinkedIn" value={draft.basics.linkedin} onChange={value => updateBasics('linkedin', value)} />
        <DraftInput label="Profile Image" value={draft.basics.image} onChange={value => updateBasics('image', value)} />
      </div>
    </>
  );
}

function SummarySection({ draft, updateDraft, updateSectionTitle }) {
  return (
    <>
      <EditorSectionHeading title="Summary" description="Section names, professional summary, and selected strengths." />
      <div className="form-grid two">
        <DraftInput label="Summary Section Title" value={draft.sectionTitles.summary} onChange={value => updateSectionTitle('summary', value)} />
        <DraftInput label="Strengths Section Title" value={draft.sectionTitles.strengths} onChange={value => updateSectionTitle('strengths', value)} />
      </div>
      <DraftTextArea
        label="Professional Summary"
        rows={7}
        value={draft.summary}
        onChange={value => updateDraft(current => ({ ...current, summary: value }))}
      />
      <DraftTextArea
        label="Selected Strengths"
        rows={6}
        value={draft.selectedStrengthsText}
        onChange={value => updateDraft(current => ({ ...current, selectedStrengthsText: value }))}
        help="One strength per line."
      />
    </>
  );
}

function SkillsSection({ draft, updateDraft }) {
  return (
    <>
      <EditorSectionHeading title="Skills" description="Group skills into scannable resume categories." />
      <DraftInput
        label="Skills Section Title"
        value={draft.sectionTitles.skills}
        onChange={value => updateDraft(current => updateNestedValue(current, ['sectionTitles', 'skills'], value))}
      />
      {draft.skills.map((group, index) => (
        <div className="nested-card" key={`${group.name}-${index}`}>
          <div className="nested-card-header">
            <h3>Skill Group {index + 1}</h3>
            <button type="button" onClick={() => updateDraft(current => ({ ...current, skills: removeResumeArrayItem(current.skills, index) }))}>
              <Trash2 size={16} />
              <span>Remove</span>
            </button>
          </div>
          <DraftInput
            label="Group Name"
            value={group.name}
            onChange={value => updateDraft(current => ({
              ...current,
              skills: updateArrayItem(current.skills, index, { name: value })
            }))}
          />
          <DraftTextArea
            label="Keywords"
            rows={6}
            value={group.keywordsText}
            onChange={value => updateDraft(current => ({
              ...current,
              skills: updateArrayItem(current.skills, index, { keywordsText: value })
            }))}
            help="One skill per line."
          />
        </div>
      ))}
      <Button type="button" variant="bordered" onPress={() => updateDraft(addSkillGroup)}>
        <Plus size={16} />
        <span>Add Skill Group</span>
      </Button>
    </>
  );
}

function ExperienceSection({ draft, updateDraft }) {
  return (
    <>
      <EditorSectionHeading title="Experience" description="Edit roles, dates, and bullet points from the resume experience section." />
      <DraftInput
        label="Experience Section Title"
        value={draft.sectionTitles.work}
        onChange={value => updateDraft(current => updateNestedValue(current, ['sectionTitles', 'work'], value))}
      />
      {draft.experience.map((item, index) => (
        <div className="nested-card" key={`${item.company}-${item.role}-${index}`}>
          <div className="nested-card-header">
            <h3>Experience {index + 1}</h3>
            <button type="button" onClick={() => updateDraft(current => ({ ...current, experience: removeResumeArrayItem(current.experience, index) }))}>
              <Trash2 size={16} />
              <span>Remove</span>
            </button>
          </div>
          <div className="form-grid two">
            <DraftInput label="Role" value={item.role} onChange={value => updateExperience(updateDraft, index, { role: value })} />
            <DraftInput label="Company" value={item.company} onChange={value => updateExperience(updateDraft, index, { company: value })} />
            <DraftInput label="Location" value={item.location} onChange={value => updateExperience(updateDraft, index, { location: value })} />
            <DraftInput label="Dates" value={item.dates} onChange={value => updateExperience(updateDraft, index, { dates: value })} />
          </div>
          <DraftTextArea
            label="Highlights"
            rows={7}
            value={item.bulletsText}
            onChange={value => updateExperience(updateDraft, index, { bulletsText: value })}
            help="One bullet per line."
          />
        </div>
      ))}
      <Button type="button" variant="bordered" onPress={() => updateDraft(addExperienceItem)}>
        <Plus size={16} />
        <span>Add Experience</span>
      </Button>
    </>
  );
}

function EducationSection({ draft, updateDraft }) {
  return (
    <>
      <EditorSectionHeading title="Education" description="Education entries are optional but stay ready for template support." />
      <DraftInput
        label="Education Section Title"
        value={draft.sectionTitles.education}
        onChange={value => updateDraft(current => updateNestedValue(current, ['sectionTitles', 'education'], value))}
      />
      {draft.education.length === 0 ? <p className="muted">No education entries yet.</p> : null}
      {draft.education.map((item, index) => (
        <div className="nested-card" key={`${item.school}-${item.credential}-${index}`}>
          <div className="nested-card-header">
            <h3>Education {index + 1}</h3>
            <button type="button" onClick={() => updateDraft(current => ({ ...current, education: removeResumeArrayItem(current.education, index) }))}>
              <Trash2 size={16} />
              <span>Remove</span>
            </button>
          </div>
          <div className="form-grid two">
            <DraftInput label="Credential" value={item.credential} onChange={value => updateEducation(updateDraft, index, { credential: value })} />
            <DraftInput label="School" value={item.school} onChange={value => updateEducation(updateDraft, index, { school: value })} />
            <DraftInput label="Location" value={item.location} onChange={value => updateEducation(updateDraft, index, { location: value })} />
            <DraftInput label="Dates" value={item.dates} onChange={value => updateEducation(updateDraft, index, { dates: value })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="bordered" onPress={() => updateDraft(current => ({
        ...current,
        education: [...current.education, { credential: '', school: '', location: '', dates: '' }]
      }))}>
        <Plus size={16} />
        <span>Add Education</span>
      </Button>
    </>
  );
}

function RecipientSection({ draft, updateDraft }) {
  return (
    <>
      <EditorSectionHeading title="Recipient" description="Target the company and add recipient address details for the cover letter." />
      <div className="form-grid two">
        <DraftInput
          label="Recipient Name"
          value={draft.recipient.name}
          onChange={value => updateDraft(current => updateNestedValue(current, ['recipient', 'name'], value))}
        />
        <DraftInput
          label="Recipient Company"
          value={draft.recipient.company}
          onChange={value => updateDraft(current => updateNestedValue(current, ['recipient', 'company'], value))}
        />
      </div>
      <DraftTextArea
        label="Recipient Address Lines"
        rows={4}
        value={draft.recipient.addressLinesText}
        onChange={value => updateDraft(current => updateNestedValue(current, ['recipient', 'addressLinesText'], value))}
        help="One address line per line."
      />
    </>
  );
}

function CoverLetterContentSection({ draft, updateDraft }) {
  return (
    <>
      <EditorSectionHeading title="Content" description="Edit the salutation, opening, body paragraphs, closing, and signoff." />
      <DraftInput
        label="Greeting"
        value={draft.greeting}
        onChange={value => updateDraft(current => ({ ...current, greeting: value }))}
      />
      <DraftTextArea
        label="Opening Paragraph"
        rows={5}
        value={draft.opening}
        onChange={value => updateDraft(current => ({ ...current, opening: value }))}
      />
      {draft.body.map((paragraph, index) => (
        <div className="nested-card" key={`paragraph-${index}`}>
          <div className="nested-card-header">
            <h3>Body Paragraph {index + 1}</h3>
            <button type="button" onClick={() => updateDraft(current => ({ ...current, body: removeCoverLetterArrayItem(current.body, index) }))}>
              <Trash2 size={16} />
              <span>Remove</span>
            </button>
          </div>
          <DraftTextArea
            label="Paragraph Text"
            rows={6}
            value={paragraph.text}
            onChange={value => updateBodyParagraph(updateDraft, index, value)}
          />
        </div>
      ))}
      <Button type="button" variant="bordered" onPress={() => updateDraft(addBodyParagraph)}>
        <Plus size={16} />
        <span>Add Paragraph</span>
      </Button>
      <DraftTextArea
        label="Closing Paragraph"
        rows={4}
        value={draft.closing}
        onChange={value => updateDraft(current => ({ ...current, closing: value }))}
      />
      <DraftInput
        label="Signature"
        value={draft.signature}
        onChange={value => updateDraft(current => ({ ...current, signature: value }))}
      />
    </>
  );
}

function JsonPreview({ generatedJsonText, title, description }) {
  return (
    <>
      <EditorSectionHeading title={title} description={description} />
      <pre className="json-preview">{generatedJsonText}</pre>
    </>
  );
}

function EditorSectionHeading({ title, description }) {
  return (
    <div className="editor-section-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function DraftInput({ label, value, onChange }) {
  return (
    <TextField>
      <Label>{label}</Label>
      <Input value={value || ''} onChange={event => onChange(event.target.value)} />
    </TextField>
  );
}

function DraftTextArea({ label, value, onChange, rows = 5, help = '' }) {
  return (
    <TextField>
      <Label>{label}</Label>
      <TextArea rows={rows} value={value || ''} onChange={event => onChange(event.target.value)} />
      {help ? <p className="field-help">{help}</p> : null}
    </TextField>
  );
}

function updateExperience(updateDraft, index, patch) {
  updateDraft(current => ({
    ...current,
    experience: updateArrayItem(current.experience, index, patch)
  }));
}

function updateEducation(updateDraft, index, patch) {
  updateDraft(current => ({
    ...current,
    education: updateArrayItem(current.education, index, patch)
  }));
}

function updateBodyParagraph(updateDraft, index, value) {
  updateDraft(current => ({
    ...current,
    body: updateArrayItem(current.body, index, { text: value })
  }));
}

function formatTimestamp(value) {
  if (!value) return 'Unknown time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
