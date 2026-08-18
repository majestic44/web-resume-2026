import { Button, Card, Chip } from '@heroui/react';
import { QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProfileQRCode from './ProfileQRCode.jsx';

async function requestResumeQrStatus(profileId) {
  const response = await fetch(`/api/admin/profiles/${profileId}/resume-qr`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to load QR code status.');
  return payload;
}

async function requestCreateOrRotate(profileId) {
  const response = await fetch(`/api/admin/profiles/${profileId}/resume-qr`, { method: 'POST' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to generate a QR code.');
  return payload;
}

async function requestDisable(profileId) {
  const response = await fetch(`/api/admin/profiles/${profileId}/resume-qr`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) throw new Error('Unable to disable the QR code.');
}

function ResumeQrHeader({ active }) {
  return (
    <div className="resume-share-panel__head">
      <div>
        <p className="card-label">Resume QR Code</p>
        <h3>Share from the resume header</h3>
        <p className="field-help">Generate a private QR link. When opened or printed, the resume header includes the scannable code.</p>
      </div>
      <Chip color={active ? 'success' : 'default'} variant="soft">
        <QrCode size={14} />
        <span>{active ? 'Enabled' : 'Disabled'}</span>
      </Chip>
    </div>
  );
}

function ResumeQrContent({ shareUrl, active }) {
  if (shareUrl) return <ProfileQRCode shareUrl={shareUrl} />;
  if (!active) return null;

  return <p className="field-help">For security, the QR link is shown only when it is created. Regenerate it to download a fresh code.</p>;
}

export function ResumeQrPanel({ authState, profile }) {
  const [link, setLink] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState('loading');
  const [action, setAction] = useState('idle');
  const [error, setError] = useState('');
  const canManage = authState.dataSource === 'database'
    && ['owner', 'admin', 'editor'].includes(authState.user?.role)
    && Boolean(profile?.id)
    && (authState.user?.editableProfiles?.includes('*') || authState.user?.editableProfiles?.includes(profile?.slug));
  const isBusy = action !== 'idle';
  const isLoading = status === 'loading';
  const isActive = Boolean(link?.active);

  useEffect(() => {
    if (!canManage) return undefined;

    let cancelled = false;
    setStatus('loading');
    setLink(null);
    setShareUrl('');
    setError('');

    requestResumeQrStatus(profile.id)
      .then(payload => {
        if (cancelled) return;
        setLink(payload.link || null);
        setStatus('ready');
      })
      .catch(loadError => {
        if (cancelled) return;
        setError(loadError.message);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [canManage, profile?.id]);

  const createOrRotate = async () => {
    if (!profile?.id || isBusy) return;
    if (isActive && !window.confirm('Regenerate this QR code? The previous code will stop working immediately.')) return;

    setAction('creating');
    setError('');
    try {
      const payload = await requestCreateOrRotate(profile.id);
      setLink(payload.link || null);
      setShareUrl(payload.shareUrl || '');
    } catch (createError) {
      setError(createError.message);
    } finally {
      setAction('idle');
    }
  };

  const disable = async () => {
    if (!profile?.id || !isActive || isBusy) return;
    if (!window.confirm('Disable this QR code? Scans of the existing code will no longer work.')) return;

    setAction('disabling');
    setError('');
    try {
      await requestDisable(profile.id);
      setLink(current => current ? { ...current, active: false } : current);
      setShareUrl('');
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
        <ResumeQrHeader active={isActive} />
        {isLoading ? <p className="muted">Loading QR code status...</p> : null}
        {error ? <p className="editor-error">{error}</p> : null}
        <ResumeQrContent shareUrl={shareUrl} active={isActive} />
        <div className="toolbar compact">
          <Button type="button" variant={isActive ? 'bordered' : 'solid'} onPress={createOrRotate} isDisabled={isBusy || isLoading}>
            {isActive ? <RefreshCw size={16} /> : <QrCode size={16} />}
            <span>{action === 'creating' ? 'Generating...' : (isActive ? 'Regenerate QR Code' : 'Generate QR Code')}</span>
          </Button>
          {isActive ? (
            <Button type="button" variant="bordered" onPress={disable} isDisabled={isBusy}>
              <Trash2 size={16} />
              <span>{action === 'disabling' ? 'Disabling...' : 'Disable QR Code'}</span>
            </Button>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
