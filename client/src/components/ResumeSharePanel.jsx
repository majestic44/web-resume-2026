import { Button, Card, Chip } from '@heroui/react';
import { Copy, Link2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatTimestamp(value) {
  if (!value) return 'Not yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function ResumeSharePanel({ authState, profile }) {
  const [link, setLink] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState('loading');
  const [action, setAction] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManage = authState.dataSource === 'database'
    && ['owner', 'admin', 'editor'].includes(authState.user?.role)
    && Boolean(profile?.id)
    && (authState.user?.editableProfiles?.includes('*') || authState.user?.editableProfiles?.includes(profile?.slug));

  useEffect(() => {
    if (!canManage) {
      setLink(null);
      setShareUrl('');
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError('');
    setMessage('');
    setShareUrl('');

    fetch(`/api/admin/profiles/${profile.id}/share-link`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load resume sharing status.');
        return payload;
      })
      .then(payload => {
        setLink(payload.link || null);
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canManage, profile?.id]);

  const createOrRotateLink = async () => {
    if (!profile?.id) return;

    if (link?.active && !window.confirm('Regenerate this share link? The previous URL will stop working immediately.')) {
      return;
    }

    setAction('creating');
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/share-link`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to create a resume share link.');

      setLink(payload.link || null);
      setShareUrl(payload.shareUrl || '');
      setMessage(link?.active ? 'Share link regenerated. The previous URL is now invalid.' : 'Secure resume share link created. Copy it now to send it privately.');
    } catch (createError) {
      setError(createError.message);
    } finally {
      setAction('idle');
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Share link copied to your clipboard.');
    } catch {
      setError('Unable to copy the share link. Select and copy it manually.');
    }
  };

  const disableLink = async () => {
    if (!profile?.id || !link?.active) return;
    if (!window.confirm('Disable this share link? Anyone using the current URL will lose access immediately.')) return;

    setAction('disabling');
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/share-link`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to disable the share link.');
      }

      setLink(current => current ? { ...current, active: false } : current);
      setShareUrl('');
      setMessage('Resume sharing disabled. The prior URL no longer works.');
    } catch (disableError) {
      setError(disableError.message);
    } finally {
      setAction('idle');
    }
  };

  if (!canManage) return null;

  return (
    <Card className="resume-share-panel">
      <Card.Content className="form-stack">
        <div className="resume-share-panel__head">
          <div>
            <p className="card-label">Private Sharing</p>
            <h3>Share Resume</h3>
            <p className="field-help">A private link opens only this resume. It does not expose household profiles, the CMS, or cover letters.</p>
          </div>
          <Chip color={link?.active ? 'success' : 'default'} variant="soft">
            <ShieldCheck size={14} />
            <span>{link?.active ? 'Enabled' : 'Disabled'}</span>
          </Chip>
        </div>

        {status === 'loading' ? <p className="muted">Loading sharing status...</p> : null}
        {error ? <p className="editor-error">{error}</p> : null}
        {message ? <p className="editor-success">{message}</p> : null}

        {link?.active ? (
          <div className="resume-share-panel__details">
            <span>Created {formatTimestamp(link.createdAt)}</span>
            <span>Last opened {formatTimestamp(link.lastAccessedAt)}</span>
          </div>
        ) : null}

        {shareUrl ? (
          <label className="resume-share-panel__url">
            <span>New share URL</span>
            <input value={shareUrl} readOnly onFocus={event => event.target.select()} />
          </label>
        ) : link?.active ? (
          <p className="field-help">For security, existing share URLs are never shown again. Regenerate the link to receive a fresh URL to copy.</p>
        ) : null}

        <div className="toolbar compact">
          {shareUrl ? (
            <Button type="button" onPress={copyLink}>
              <Copy size={16} />
              <span>Copy Link</span>
            </Button>
          ) : null}
          <Button type="button" variant={link?.active ? 'bordered' : 'solid'} onPress={createOrRotateLink} isDisabled={action !== 'idle' || status === 'loading'}>
            {link?.active ? <RefreshCw size={16} /> : <Link2 size={16} />}
            <span>{action === 'creating' ? 'Generating...' : (link?.active ? 'Regenerate Link' : 'Generate Link')}</span>
          </Button>
          {link?.active ? (
            <Button type="button" variant="bordered" onPress={disableLink} isDisabled={action !== 'idle'}>
              <Trash2 size={16} />
              <span>{action === 'disabling' ? 'Disabling...' : 'Disable Link'}</span>
            </Button>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
