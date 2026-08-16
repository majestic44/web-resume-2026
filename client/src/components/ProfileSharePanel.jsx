import { Button, Card, Input, Label, TextField } from '@heroui/react';
import { Copy, Link2, LockKeyhole, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProfileQRCode from './ProfileQRCode.jsx';

export function ProfileSharePanel({ authState, profile }) {
  const [link, setLink] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [referencePassword, setReferencePassword] = useState('');
  const [status, setStatus] = useState('loading');
  const [action, setAction] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canManage = authState.dataSource === 'database'
    && ['owner', 'admin', 'editor'].includes(authState.user?.role)
    && Boolean(profile?.id)
    && (authState.user?.editableProfiles?.includes('*') || authState.user?.editableProfiles?.includes(profile?.slug));

  useEffect(() => {
    if (!canManage) return;
    setStatus('loading');
    setShareUrl('');
    fetch(`/api/admin/profiles/${profile.id}/profile-share-link`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load profile sharing status.');
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

  const createOrRotate = async () => {
    if (!profile?.id || action !== 'idle') return;
    if (link?.active && !window.confirm('Regenerate this profile link? The prior URL and reference password will stop working immediately.')) return;
    if (referencePassword.length < 12) {
      setError('Choose a reference password with at least 12 characters.');
      return;
    }

    setAction('creating');
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/profile-share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencesPassword: referencePassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to create a profile share link.');
      setLink(payload.link || null);
      setShareUrl(payload.shareUrl || '');
      setReferencePassword('');
      setMessage('Secure profile link created. Save the reference password separately, then copy the link to share it.');
    } catch (createError) {
      setError(createError.message);
    } finally {
      setAction('idle');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Profile share link copied to your clipboard.');
    } catch {
      setError('Unable to copy the share link. Select and copy it manually.');
    }
  };

  const disableLink = async () => {
    if (!profile?.id || !link?.active || !window.confirm('Disable this profile link? The shared profile and protected references will stop working immediately.')) return;
    setAction('disabling');
    setError('');
    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/profile-share-link`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Unable to disable the profile share link.');
      setLink(current => current ? { ...current, active: false } : null);
      setShareUrl('');
      setMessage('Profile sharing disabled. The prior URL no longer works.');
    } catch (disableError) {
      setError(disableError.message);
    } finally {
      setAction('idle');
    }
  };

  if (!canManage) return null;

  return (
    <Card className="resume-share-panel profile-share-panel">
      <Card.Content className="form-stack">
        <div className="resume-share-panel__head">
          <div>
            <p className="card-label">Private Profile Sharing</p>
            <h3>Share Profile</h3>
            <p className="field-help">Shares the profile, portfolio, certifications, and resume. Cover letters stay private; references require a separate password.</p>
          </div>
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        {status === 'loading' ? <p className="muted">Loading profile sharing status...</p> : null}
        {error ? <p className="editor-error">{error}</p> : null}
        {message ? <p className="editor-success">{message}</p> : null}
        {shareUrl ? <label className="resume-share-panel__url"><span>New profile share URL</span><input value={shareUrl} readOnly onFocus={event => event.target.select()} /></label> : null}
        {link?.active && !shareUrl ? <p className="field-help">The active URL is intentionally not shown again. Regenerate it to receive a new copy.</p> : null}
        <TextField isRequired isInvalid={Boolean(error && referencePassword.length < 12)}>
          <Label>{link?.active ? 'New reference password for regeneration' : 'Reference password'}</Label>
          <Input type="password" autoComplete="new-password" value={referencePassword} onChange={event => setReferencePassword(event.target.value)} placeholder="At least 12 characters" isDisabled={action !== 'idle'} />
        </TextField>
        <div className="toolbar compact">
          {shareUrl ? <Button type="button" onPress={copyLink}><Copy size={16} /><span>Copy Link</span></Button> : null}
          <Button type="button" variant={link?.active ? 'bordered' : 'solid'} onPress={createOrRotate} isDisabled={action !== 'idle' || status === 'loading'}>
            {link?.active ? <RefreshCw size={16} /> : <Link2 size={16} />}<span>{action === 'creating' ? 'Generating...' : (link?.active ? 'Regenerate Link' : 'Generate Link')}</span>
          </Button>
          {link?.active ? <Button type="button" variant="bordered" onPress={disableLink} isDisabled={action !== 'idle'}><Trash2 size={16} /><span>{action === 'disabling' ? 'Disabling...' : 'Disable Link'}</span></Button> : null}
        </div>
      </Card.Content>
    </Card>
  );
}
