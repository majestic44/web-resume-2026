import { Button, Card, Chip, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { Eye, History, ImagePlus, Plus, RotateCcw, Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CertificationsWorkspace } from '../components/CertificationsWorkspace.jsx';
import { PortfolioWorkspace } from '../components/PortfolioWorkspace.jsx';
import { ReferencesWorkspace } from '../components/ReferencesWorkspace.jsx';
import { ResumeSharePanel } from '../components/ResumeSharePanel.jsx';
import { ProfileSharePanel } from '../components/ProfileSharePanel.jsx';
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
  { id: 'cover-letter', label: 'Cover Letter' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'references', label: 'References' }
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
  ],
  certifications: [
    { id: 'items', label: 'Items' }
  ],
  references: [
    { id: 'items', label: 'Items' }
  ],
  portfolio: [
    { id: 'projects', label: 'Projects' }
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
  if (['portfolio', 'certifications', 'references'].includes(type)) return `/profile/${slug}`;
  return type === 'cover-letter' ? `/cover-letter/${slug}` : `/resume/${slug}`;
}

function documentTypeTitle(type) {
  if (type === 'portfolio') return 'portfolio';
  if (type === 'certifications') return 'certifications';
  if (type === 'references') return 'references';
  return type === 'cover-letter' ? 'cover letter' : 'resume';
}

function documentTypeHeadline(type) {
  if (type === 'portfolio') return 'Portfolio manager';
  if (type === 'certifications') return 'Certifications manager';
  if (type === 'references') return 'References manager';
  return type === 'cover-letter' ? 'Cover letter editor' : 'Resume editor';
}

function documentCountSummary(type, json) {
  if (type === 'portfolio') {
    return [
      { label: 'Projects', value: '-' },
      { label: 'Public', value: '-' },
      { label: 'Featured', value: '-' }
    ];
  }

  if (type === 'certifications') {
    return [
      { label: 'Credentials', value: '-' },
      { label: 'Active', value: '-' },
      { label: 'Expired', value: '-' }
    ];
  }

  if (type === 'references') {
    return [
      { label: 'References', value: '-' },
      { label: 'Public', value: '-' },
      { label: 'Contact Ready', value: '-' }
    ];
  }

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

function formatBytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function replaceMediaPathValue(currentValue, fromPath, toPath) {
  return currentValue === fromPath ? toPath : currentValue;
}

function normalizeSnapshotContent(content, fallbackTemplate = 'modern') {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return {};
  }

  return {
    ...content,
    template: content.template || fallbackTemplate
  };
}

function historySourceStatus(entry, liveUpdatedAt) {
  if (!entry?.sourceUpdatedAt || !liveUpdatedAt) return '';

  const sourceTime = new Date(entry.sourceUpdatedAt).getTime();
  const liveTime = new Date(liveUpdatedAt).getTime();

  if (Number.isNaN(sourceTime) || Number.isNaN(liveTime)) return '';
  if (sourceTime < liveTime) return 'Saved before the latest published update';
  if (sourceTime > liveTime) return 'Saved against newer source data';
  return 'Saved against the current live document';
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
  const [restoreState, setRestoreState] = useState('idle');
  const [savedJsonText, setSavedJsonText] = useState('{}');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftMeta, setSavedDraftMeta] = useState(null);
  const [selectedHistoryVersionId, setSelectedHistoryVersionId] = useState('');
  const isWorkspaceMode = ['portfolio', 'certifications', 'references'].includes(selectedDocumentType);

  useEffect(() => {
    fetch('/api/internal/profiles')
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

    if (isWorkspaceMode) {
      setSourceDocument(null);
      setDraft(null);
      setHistory([]);
      setSavedJsonText('{}');
      setHasSavedDraft(false);
      setSavedDraftMeta(null);
      setSelectedHistoryVersionId('');
      setStatusMessage(
        selectedDocumentType === 'portfolio'
          ? 'Portfolio items are managed directly for the selected profile.'
          : selectedDocumentType === 'certifications'
            ? 'Certifications are managed directly for the selected profile.'
            : 'References are managed directly for the selected profile.'
      );
      setSaveState('idle');
      setPublishState('idle');
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError('');

    fetch(`/api/internal/documents/${selectedDocumentType}/${selectedSlug}`)
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
        setSavedDraftMeta(draftPayload.draft || null);
        setSelectedHistoryVersionId(draftPayload.history?.[0]?.versionId || '');
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
  }, [isWorkspaceMode, selectedDocumentType, selectedSlug]);

  const generatedJson = useMemo(
    () => (isWorkspaceMode || !draft ? null : draftToJsonForType(selectedDocumentType, draft)),
    [draft, isWorkspaceMode, selectedDocumentType]
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
  const isPortfolioMode = selectedDocumentType === 'portfolio';
  const isDirty = !isWorkspaceMode && Boolean(sourceDocument && generatedJsonText !== savedJsonText);
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
      setSavedDraftMeta(null);
      setStatusMessage(`Draft reset to source ${documentTypeTitle(selectedDocumentType)}`);
      setSaveState('idle');

      const draftResponse = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}`);
      const draftPayload = draftResponse.ok ? await draftResponse.json() : { history: [] };
      setHistory(draftPayload.history || []);
      setSelectedHistoryVersionId(draftPayload.history?.[0]?.versionId || '');
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
      setSavedDraftMeta(payload.draft || null);
      setSelectedHistoryVersionId(current => current || payload.history?.[0]?.versionId || '');
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
      setSavedDraftMeta(null);
      setSelectedHistoryVersionId(payload.history?.[0]?.versionId || '');
      setStatusMessage(`Published live ${documentTypeTitle(selectedDocumentType)} at ${formatTimestamp(payload.document.meta?.updatedAt || payload.publishedAt)}`);
      setSaveState('idle');
      setPublishState('published');
    } catch (publishError) {
      setError(publishError.message);
      setPublishState('error');
    }
  };

  const selectedHistoryEntry = useMemo(
    () => history.find(entry => entry.versionId === selectedHistoryVersionId) || history[0] || null,
    [history, selectedHistoryVersionId]
  );
  const selectedHistoryContent = useMemo(
    () => normalizeSnapshotContent(selectedHistoryEntry?.content, sourceDocument?.content?.template || selectedProfile?.template || 'modern'),
    [selectedHistoryEntry, sourceDocument?.content?.template, selectedProfile?.template]
  );
  const selectedHistorySummaryItems = useMemo(
    () => documentCountSummary(selectedDocumentType, selectedHistoryContent),
    [selectedDocumentType, selectedHistoryContent]
  );

  const restoreHistoryVersion = async entry => {
    if (!entry?.versionId) return;

    const hasUnsavedChanges = isDirty;
    const confirmMessage = hasUnsavedChanges
      ? 'Restore this saved version as the current draft? Your unsaved editor changes will be replaced.'
      : 'Restore this saved version as the current draft?';
    if (!window.confirm(confirmMessage)) return;

    setRestoreState(entry.versionId);
    setError('');
    setPublishState('idle');

    try {
      const response = await fetch(`/api/drafts/${selectedDocumentType}/${selectedSlug}/restore/${entry.versionId}`, {
        method: 'POST'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to restore draft version.');
      }

      const nextContent = normalizeSnapshotContent(
        payload.draft?.content,
        sourceDocument?.content?.template || selectedProfile?.template || 'modern'
      );

      setDraft(createDraftForType(selectedDocumentType, nextContent));
      setSavedJsonText(JSON.stringify(nextContent, null, 2));
      setHistory(payload.history || []);
      setHasSavedDraft(Boolean(payload.draft));
      setSavedDraftMeta(payload.draft || null);
      setSelectedHistoryVersionId(payload.draft?.versionId || payload.history?.[0]?.versionId || '');
      setSaveState('saved');
      setStatusMessage(`Restored draft snapshot from ${formatTimestamp(entry.savedAt)}`);
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setRestoreState('idle');
    }
  };

  return (
    <>
      <PageHeader eyebrow="Editor Draft" title={documentTypeHeadline(selectedDocumentType)}>
        <p>
          {selectedDocumentType === 'portfolio'
            ? 'Manage each profile portfolio from the same editor workspace used for resumes and cover letters. Add project cards with images, descriptions, links, type, and progress.'
            : selectedDocumentType === 'certifications'
            ? 'Manage each profile certifications, licenses, and training credentials from the same editor workspace used for resumes, cover letters, and portfolio items.'
            : selectedDocumentType === 'references'
            ? 'Manage each profile references, recommendation notes, and contact details from the same editor workspace used for resumes, cover letters, portfolio items, and certifications.'
            : authState.dataSource === 'database'
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
              disabled={!draft || isWorkspaceMode}
            >
              {templateOptions.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
        </div>
        <div className="editor-status">
          <Chip color={isWorkspaceMode ? 'primary' : (isDirty ? 'warning' : 'success')} variant="soft">
            {isWorkspaceMode
              ? (selectedDocumentType === 'portfolio'
                  ? 'Portfolio workspace'
                  : selectedDocumentType === 'certifications'
                    ? 'Certifications workspace'
                    : 'References workspace')
              : (isDirty ? 'Unsaved draft' : 'Synced to source')}
          </Chip>
          {!isWorkspaceMode && (draft?.template ? <Chip variant="flat">{draft.template}</Chip> : selectedProfile ? <Chip variant="flat">{selectedProfile.template}</Chip> : null)}
          {statusMessage ? <Chip variant="bordered">{statusMessage}</Chip> : null}
        </div>
      </section>

      {error ? <p className="editor-error">{error}</p> : null}
      {publishState === 'published' ? <p className="editor-success">Live {documentTypeTitle(selectedDocumentType)} updated from the latest draft.</p> : null}
      {authState.dataSource === 'database' && authState.user && !editableProfiles.length ? (
        <p className="editor-error">This account does not have any assigned editable profiles yet.</p>
      ) : null}

      {selectedDocumentType === 'portfolio' ? (
        <PortfolioWorkspace authState={authState} profile={selectedProfile} />
      ) : selectedDocumentType === 'certifications' ? (
        <CertificationsWorkspace authState={authState} profile={selectedProfile} />
      ) : selectedDocumentType === 'references' ? (
        <ReferencesWorkspace authState={authState} profile={selectedProfile} />
      ) : (
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
                {activeSection === 'basics' ? (
                  <BasicsSection
                    draft={draft}
                    updateBasics={updateBasics}
                    selectedDocumentType={selectedDocumentType}
                    selectedSlug={selectedSlug}
                    authState={authState}
                    canEditSelectedProfile={canEditSelectedProfile}
                  />
                ) : null}
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
            {selectedDocumentType === 'resume' ? <><ResumeSharePanel authState={authState} profile={selectedProfile} /><ProfileSharePanel authState={authState} profile={selectedProfile} /></> : null}
            <div className="history-block">
              <div className="history-block__head">
                <div>
                  <p className="card-label">Version History</p>
                  <h3>Recent saves</h3>
                </div>
                <span className="history-count-chip">
                  <History size={14} />
                  <span>{history.length}</span>
                </span>
              </div>
              {history.length === 0 ? <p className="muted">No saved snapshots yet.</p> : null}
              {history.slice(0, 8).map(entry => (
                <div className={`history-row${selectedHistoryEntry?.versionId === entry.versionId ? ' is-active' : ''}`} key={entry.versionId}>
                  <button type="button" className="history-row__select" onClick={() => setSelectedHistoryVersionId(entry.versionId)}>
                    <span>{formatTimestamp(entry.savedAt)}</span>
                    <small>{entry.savedByName || entry.versionId.slice(0, 8)}</small>
                  </button>
                  <div className="history-row__actions">
                    <button type="button" onClick={() => setSelectedHistoryVersionId(entry.versionId)}>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => restoreHistoryVersion(entry)}
                      disabled={restoreState === entry.versionId || !canEditSelectedProfile || (authState.dataSource === 'database' && !authState.user)}
                    >
                      {restoreState === entry.versionId ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedHistoryEntry ? (
              <div className="history-detail-card">
                <div className="history-detail-card__head">
                  <div>
                    <p className="card-label">Selected Snapshot</p>
                    <h3>{formatTimestamp(selectedHistoryEntry.savedAt)}</h3>
                  </div>
                  {savedDraftMeta?.versionId === selectedHistoryEntry.versionId ? <Chip variant="flat">Current Saved Draft</Chip> : null}
                </div>

                <div className="history-detail-card__meta">
                  <span>Version {selectedHistoryEntry.versionId.slice(0, 8)}</span>
                  {selectedHistoryEntry.savedByName ? <span>Saved by {selectedHistoryEntry.savedByName}</span> : null}
                  {historySourceStatus(selectedHistoryEntry, sourceDocument?.meta?.updatedAt) ? (
                    <span>{historySourceStatus(selectedHistoryEntry, sourceDocument?.meta?.updatedAt)}</span>
                  ) : null}
                </div>

                <div className="history-compare-grid">
                  {selectedHistorySummaryItems.map((item, index) => (
                    <div className="history-compare-row" key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>
                        <strong>{item.value}</strong>
                        <span>Snapshot</span>
                      </dd>
                      <dd>
                        <strong>{summaryItems[index]?.value ?? '-'}</strong>
                        <span>Current</span>
                      </dd>
                    </div>
                  ))}
                </div>

                {selectedHistoryEntry.content ? (
                  <pre className="history-json-preview">{JSON.stringify(selectedHistoryContent, null, 2)}</pre>
                ) : (
                  <p className="field-help">This older save does not include snapshot content, so only timestamp metadata is available.</p>
                )}

                <div className="toolbar compact">
                  <Button
                    type="button"
                    variant="bordered"
                    isDisabled={restoreState === selectedHistoryEntry.versionId || !canEditSelectedProfile || (authState.dataSource === 'database' && !authState.user)}
                    onPress={() => restoreHistoryVersion(selectedHistoryEntry)}
                  >
                    <Undo2 size={16} />
                    <span>{restoreState === selectedHistoryEntry.versionId ? 'Restoring...' : 'Restore Snapshot'}</span>
                  </Button>
                </div>
              </div>
            ) : null}
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
      )}
    </>
  );
}

function BasicsSection({ draft, updateBasics, selectedDocumentType, selectedSlug, authState, canEditSelectedProfile }) {
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
      {selectedDocumentType === 'resume' ? (
        <ProfilePhotoLibrary
          profileSlug={selectedSlug}
          authState={authState}
          canEditSelectedProfile={canEditSelectedProfile}
          currentValue={draft.basics.image}
          onSelect={value => updateBasics('image', value)}
        />
      ) : null}
    </>
  );
}

function ProfilePhotoLibrary({ profileSlug, authState, canEditSelectedProfile, currentValue, onSelect }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [uploadState, setUploadState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaActionId, setMediaActionId] = useState(null);
  const uploadInputRef = useRef(null);

  const canUseLibrary = authState.dataSource === 'database' && Boolean(authState.user) && canEditSelectedProfile && Boolean(profileSlug);

  useEffect(() => {
    if (!canUseLibrary) {
      setStatus('idle');
      setMediaItems([]);
      setError('');
      return;
    }

    setStatus('loading');
    setError('');

    fetch(`/api/admin/profiles/${profileSlug}/media`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load profile media.');
        }

        return payload;
      })
      .then(payload => {
        setMediaItems((payload.items || []).filter(item => item.kind === 'image'));
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canUseLibrary, profileSlug]);

  const handleUpload = async () => {
    if (!selectedFile || !canUseLibrary) return;

    setUploadState('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/admin/profiles/${profileSlug}/media`, {
        method: 'POST',
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to upload profile image.');
      }

      setMediaItems(current => [payload.item, ...current.filter(item => item.kind === 'image')]);
      onSelect(payload.item.publicPath);
      setSelectedFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
      setUploadState('uploaded');
    } catch (uploadError) {
      setError(uploadError.message);
      setUploadState('error');
    }
  };

  const handleDeleteMedia = async mediaItem => {
    const confirmed = window.confirm(`Delete profile image "${mediaItem.originalName}"?`);
    if (!confirmed) return;

    setMediaActionId(mediaItem.id);
    setError('');

    try {
      const response = await fetch(`/api/admin/profiles/${profileSlug}/media/${mediaItem.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete profile image.');
      }

      setMediaItems(current => current.filter(item => item.id !== mediaItem.id));
      if (currentValue === mediaItem.publicPath) {
        onSelect('');
      }
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setMediaActionId(null);
    }
  };

  const handleReplaceMedia = async (mediaItem, file) => {
    if (!file) return;

    setMediaActionId(mediaItem.id);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/profiles/${profileSlug}/media/${mediaItem.id}/replace`, {
        method: 'POST',
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to replace profile image.');
      }

      setMediaItems(current => current.map(item => (item.id === mediaItem.id ? payload.item : item)));
      onSelect(replaceMediaPathValue(currentValue, mediaItem.publicPath, payload.item.publicPath));
    } catch (replaceError) {
      setError(replaceError.message);
    } finally {
      setMediaActionId(null);
    }
  };

  return (
    <div className="profile-photo-panel">
      <div className="editor-section-heading">
        <h2>Profile Photo Library</h2>
        <p>Upload or reuse an image from the media library for the public profile photo.</p>
      </div>

      {currentValue ? (
        <div className="profile-photo-panel__current">
          <img src={currentValue} alt="Current profile" />
          <div>
            <p className="card-label">Current Image</p>
            <p className="field-help">{currentValue}</p>
            <Button type="button" variant="bordered" onPress={() => onSelect('')}>
              <Trash2 size={16} />
              <span>Clear Image</span>
            </Button>
          </div>
        </div>
      ) : null}

      {!canUseLibrary ? (
        <p className="field-help">
          {authState.dataSource !== 'database'
            ? 'Switch to database mode to upload and reuse profile photos from the media library.'
            : authState.user
              ? 'This account does not currently have access to the media library for the selected profile.'
              : 'Sign in to use uploaded profile images from the media library.'}
        </p>
      ) : (
        <>
          {error ? <p className="editor-error">{error}</p> : null}

          <div className="profile-photo-panel__upload">
            <label className="form-panel profile-photo-panel__upload-field">
              <span>Choose Image</span>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={event => setSelectedFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className="profile-photo-panel__upload-copy">
              <p>{selectedFile ? selectedFile.name : 'No image selected yet.'}</p>
              <p className="field-help">Supported image uploads are stored in the profile media library and can be reused in portfolio cards later.</p>
            </div>
            <Button type="button" onPress={handleUpload} isDisabled={!selectedFile || uploadState === 'uploading'}>
              <ImagePlus size={16} />
              <span>{uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}</span>
            </Button>
          </div>

          {status === 'loading' ? (
            <div className="loading-row">
              <Spinner size="sm" />
              <p>Loading profile images...</p>
            </div>
          ) : null}

          {status === 'ready' && mediaItems.length === 0 ? (
            <div className="media-library-empty">
              <p>No uploaded images yet. Upload one above to start the profile photo library.</p>
            </div>
          ) : null}

          {mediaItems.length ? (
            <div className="media-library-grid">
              {mediaItems.slice(0, 8).map(item => (
                <ProfilePhotoCard
                  key={item.id}
                  item={item}
                  isActive={currentValue === item.publicPath}
                  isWorking={mediaActionId === item.id}
                  onSelect={() => onSelect(item.publicPath)}
                  onReplace={handleReplaceMedia}
                  onDelete={handleDeleteMedia}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ProfilePhotoCard({ item, isActive, isWorking, onSelect, onReplace, onDelete }) {
  const replaceInputRef = useRef(null);

  return (
    <div className={`media-library-card media-library-card--selectable${isActive ? ' media-library-card--active' : ''}`}>
      <button type="button" className="media-library-card__select-button" onClick={onSelect} disabled={isWorking}>
        <div className="media-library-card__preview">
          <img src={item.publicPath} alt={item.originalName} loading="lazy" />
        </div>
        <div className="media-library-card__body">
          <p className="card-label">image</p>
          <h3>{item.originalName.replace(/\.[^.]+$/, '')}</h3>
          <p className="media-library-card__meta">{formatBytes(item.sizeBytes)}</p>
        </div>
      </button>
      <div className="media-library-card__actions media-library-card__actions--stacked">
        <button type="button" onClick={onSelect} disabled={isWorking}>
          <ImagePlus size={15} />
          <span>{isActive ? 'Selected' : 'Use Photo'}</span>
        </button>
        <button type="button" onClick={() => replaceInputRef.current?.click()} disabled={isWorking}>
          <ImagePlus size={15} />
          <span>Replace</span>
        </button>
        <button type="button" onClick={() => onDelete(item)} disabled={isWorking}>
          <Trash2 size={15} />
          <span>Delete</span>
        </button>
      </div>
      <input
        ref={replaceInputRef}
        className="media-library-card__file-input"
        type="file"
        accept="image/*"
        onChange={event => {
          const nextFile = event.target.files?.[0] || null;
          if (nextFile) {
            onReplace(item, nextFile);
          }
          event.target.value = '';
        }}
      />
    </div>
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
