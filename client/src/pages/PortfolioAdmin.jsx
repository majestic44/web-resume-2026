import { Alert, Button, Card, Spinner } from '@heroui/react';
import { Copy, ExternalLink, FileImage, FileText, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';

function formatBytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaLabel(mediaItem) {
  return String(mediaItem?.originalName || '')
    .replace(/\.[^.]+$/, '')
    .trim();
}

function MediaLibraryCard({ item, isWorking, onCopy, onReplace, onDelete }) {
  const replaceInputRef = useRef(null);

  return (
    <div className="media-library-card">
      <div className="media-library-card__preview">
        {item.kind === 'image' ? (
          <img src={item.publicPath} alt={item.originalName} loading="lazy" />
        ) : item.kind === 'pdf' ? (
          <div className="media-library-card__placeholder">
            <FileText size={22} />
            <span>PDF</span>
          </div>
        ) : (
          <div className="media-library-card__placeholder">
            <FileImage size={22} />
            <span>File</span>
          </div>
        )}
      </div>
      <div className="media-library-card__body">
        <p className="card-label">{item.kind}</p>
        <h3>{mediaLabel(item)}</h3>
        <p className="media-library-card__meta">{formatBytes(item.sizeBytes)}</p>
        <p className="field-help media-library-card__path">{item.publicPath}</p>
        <div className="media-library-card__actions">
          <a className="hero-link-button" href={item.publicPath} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            <span>Open File</span>
          </a>
          <button type="button" onClick={() => onCopy(item.publicPath)} disabled={isWorking}>
            <Copy size={15} />
            <span>Copy Path</span>
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
          accept="image/*,application/pdf"
          onChange={event => {
            const nextFile = event.target.files?.[0] || null;
            if (nextFile) {
              onReplace(item, nextFile);
            }
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export function PortfolioAdmin({ authState }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [uploadState, setUploadState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaActionId, setMediaActionId] = useState(null);
  const [copiedPath, setCopiedPath] = useState('');
  const uploadInputRef = useRef(null);

  const canManage = authState.dataSource === 'database' && ['owner', 'admin', 'editor'].includes(authState.user?.role);

  useEffect(() => {
    setError('');

    fetch('/api/internal/profiles')
      .then(response => response.json())
      .then(payload => {
        const nextProfiles = payload.profiles || [];
        setProfiles(nextProfiles);
        if (!selectedSlug && nextProfiles.length) {
          setSelectedSlug(nextProfiles[0].slug);
        }
      })
      .catch(() => setProfiles([]));
  }, []);

  const editableProfiles = useMemo(() => {
    if (!canManage) return [];
    if (authState.user?.editableProfiles?.includes('*')) return profiles;

    return profiles.filter(profile => authState.user?.editableProfiles?.includes(profile.slug));
  }, [authState.user, canManage, profiles]);

  useEffect(() => {
    if (!editableProfiles.length) return;
    if (!editableProfiles.some(profile => profile.slug === selectedSlug)) {
      setSelectedSlug(editableProfiles[0].slug);
    }
  }, [editableProfiles, selectedSlug]);

  useEffect(() => {
    if (!canManage || !selectedSlug) {
      setStatus('ready');
      setMediaItems([]);
      return;
    }

    setStatus('loading');
    setError('');

    fetch(`/api/admin/profiles/${selectedSlug}/media`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load media library.');
        }

        return payload;
      })
      .then(payload => {
        setMediaItems(payload.items || []);
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canManage, selectedSlug]);

  const selectedProfile = profiles.find(profile => profile.slug === selectedSlug);
  const publicProfileLink = selectedProfile?.profileLink || `/profile/${selectedProfile?.slug || ''}`;

  const counts = useMemo(() => ({
    total: mediaItems.length,
    images: mediaItems.filter(item => item.kind === 'image').length,
    pdfs: mediaItems.filter(item => item.kind === 'pdf').length
  }), [mediaItems]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedSlug) return;

    setUploadState('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/admin/profiles/${selectedSlug}/media`, {
        method: 'POST',
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to upload media file.');
      }

      setMediaItems(current => [payload.item, ...current]);
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

  const handleCopyPath = async publicPath => {
    try {
      await navigator.clipboard.writeText(publicPath);
      setCopiedPath(publicPath);
      window.setTimeout(() => setCopiedPath(''), 1800);
    } catch {
      setCopiedPath('');
    }
  };

  const handleDeleteMedia = async mediaItem => {
    const confirmed = window.confirm(`Delete media asset "${mediaItem.originalName}"?`);
    if (!confirmed) return;

    setMediaActionId(mediaItem.id);
    setError('');

    try {
      const response = await fetch(`/api/admin/profiles/${selectedSlug}/media/${mediaItem.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete media asset.');
      }

      setMediaItems(current => current.filter(item => item.id !== mediaItem.id));
      if (copiedPath === mediaItem.publicPath) {
        setCopiedPath('');
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

      const response = await fetch(`/api/admin/profiles/${selectedSlug}/media/${mediaItem.id}/replace`, {
        method: 'POST',
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to replace media asset.');
      }

      setMediaItems(current => current.map(item => (item.id === mediaItem.id ? payload.item : item)));
      if (copiedPath === mediaItem.publicPath) {
        setCopiedPath(payload.item.publicPath);
      }
    } catch (replaceError) {
      setError(replaceError.message);
    } finally {
      setMediaActionId(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Media" title="Media library">
        <p>
          {canManage
            ? 'Upload reusable project images, PDFs, and profile assets for each household profile. Portfolio cards stay in the editor, while file management lives here.'
            : authState.dataSource !== 'database'
              ? 'Switch to database mode to manage uploaded media from the CMS.'
              : authState.user
                ? 'This account does not currently have media library access.'
                : 'Sign in with an editor, admin, or owner account to manage uploaded media.'}
        </p>
      </PageHeader>

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Media library error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {!canManage ? null : (
        <>
          <section className="members-layout">
            <Card className="form-panel members-create-panel media-library-panel">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Upload Media</p>
                  <h2>Build the reusable asset library</h2>
                  <p className="field-help">Upload images and PDFs once, then copy their saved path into portfolio cards or use them for profile photos.</p>
                </div>

                <div className="form-grid two">
                  <label className="select-field">
                    <span>Profile</span>
                    <select value={selectedSlug} onChange={event => setSelectedSlug(event.target.value)}>
                      {editableProfiles.map(profile => <option key={profile.slug} value={profile.slug}>{profile.name}</option>)}
                    </select>
                  </label>
                  <label className="form-panel">
                    <span>Choose File</span>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={event => setSelectedFile(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="media-library-panel__upload-meta">
                  <p>{selectedFile ? selectedFile.name : 'No file selected yet.'}</p>
                  <p className="field-help">Supported: images and PDFs up to 8MB.</p>
                </div>

                <div className="toolbar">
                  <Button type="button" onPress={handleUpload} isDisabled={!selectedFile || uploadState === 'uploading' || !selectedSlug}>
                    <ImagePlus size={16} />
                    <span>{uploadState === 'uploading' ? 'Uploading...' : 'Upload to Library'}</span>
                  </Button>
                  <a className="hero-link-button" href="/editor">
                    <ExternalLink size={16} />
                    <span>Open Editor</span>
                  </a>
                  {selectedProfile ? (
                    <a className="hero-link-button" href={publicProfileLink}>
                      <ExternalLink size={16} />
                      <span>Public Profile Preview</span>
                    </a>
                  ) : null}
                  {uploadState === 'uploaded' ? <p className="editor-success">File uploaded to the media library.</p> : null}
                </div>
              </Card.Content>
            </Card>

            <Card className="members-summary-card">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Library Summary</p>
                  <h2>{counts.total} asset{counts.total === 1 ? '' : 's'}</h2>
                  <p className="field-help">Use the copied path inside portfolio project assets, or select uploaded images in the profile photo library.</p>
                </div>
                <dl className="snapshot-list compact">
                  <div>
                    <dt>Images</dt>
                    <dd>{counts.images}</dd>
                  </div>
                  <div>
                    <dt>PDFs</dt>
                    <dd>{counts.pdfs}</dd>
                  </div>
                  <div>
                    <dt>Profile</dt>
                    <dd>{selectedProfile?.name || '-'}</dd>
                  </div>
                </dl>
                {copiedPath ? <p className="field-help">Copied path: {copiedPath}</p> : null}
              </Card.Content>
            </Card>
          </section>

          <section className="profiles-admin-grid media-library-admin-grid" aria-label="Media library items">
            {status === 'loading' ? (
              <div className="loading-row">
                <Spinner size="sm" />
                <p>Loading media library...</p>
              </div>
            ) : null}

            {status === 'ready' && mediaItems.length === 0 ? (
              <Card className="profile-card member-card portfolio-empty-card">
                <Card.Content className="profile-card-content form-stack">
                  <div>
                    <p className="card-label">No Media Yet</p>
                    <h2>Start the library</h2>
                    <p>Upload the first image or PDF for this profile using the form above.</p>
                  </div>
                </Card.Content>
              </Card>
            ) : null}

            {mediaItems.map(item => (
              <MediaLibraryCard
                key={item.id}
                item={item}
                isWorking={mediaActionId === item.id}
                onCopy={handleCopyPath}
                onReplace={handleReplaceMedia}
                onDelete={handleDeleteMedia}
              />
            ))}
          </section>
        </>
      )}
    </>
  );
}
