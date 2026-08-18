import { Button, Card, Chip } from '@heroui/react';
import { QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProfileQRCode from './ProfileQRCode.jsx';

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

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    setStatus('loading');
    setLink(null);
    setShareUrl('');
    setError('');
    fetch(`/api/admin/profiles/${profile.id}/resume-qr`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load QR code status.');
        return payload;
      })
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
    if (!profile?.id || action !== 'idle') return;
    if (link?.active && !window.confirm('Regenerate this QR code? The previous code will stop working immediately.')) return;
    setAction('creating'); setError('');
    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/resume-qr`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to generate a QR code.');
      setLink(payload.link || null); setShareUrl(payload.shareUrl || '');
    } catch (createError) { setError(createError.message); } finally { setAction('idle'); }
  };

  const disable = async () => {
    if (!profile?.id || !link?.active || !window.confirm('Disable this QR code? Scans of the existing code will no longer work.')) return;
    setAction('disabling'); setError('');
    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}/resume-qr`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Unable to disable the QR code.');
      setLink(current => current ? { ...current, active: false } : current); setShareUrl('');
    } catch (disableError) { setError(disableError.message); } finally { setAction('idle'); }
  };

  if (!canManage) return null;
  return <Card className="resume-share-panel"><Card.Content className="form-stack">
    <div className="resume-share-panel__head"><div><p className="card-label">Resume QR Code</p><h3>Share from the resume header</h3><p className="field-help">Generate a private QR link. When opened or printed, the resume header includes the scannable code.</p></div><Chip color={link?.active ? 'success' : 'default'} variant="soft"><QrCode size={14} /><span>{link?.active ? 'Enabled' : 'Disabled'}</span></Chip></div>
    {status === 'loading' ? <p className="muted">Loading QR code status...</p> : null}
    {error ? <p className="editor-error">{error}</p> : null}
    {shareUrl ? <ProfileQRCode shareUrl={shareUrl} /> : link?.active ? <p className="field-help">For security, the QR link is shown only when it is created. Regenerate it to download a fresh code.</p> : null}
    <div className="toolbar compact"><Button type="button" variant={link?.active ? 'bordered' : 'solid'} onPress={createOrRotate} isDisabled={action !== 'idle' || status === 'loading'}>{link?.active ? <RefreshCw size={16} /> : <QrCode size={16} />}<span>{action === 'creating' ? 'Generating...' : (link?.active ? 'Regenerate QR Code' : 'Generate QR Code')}</span></Button>{link?.active ? <Button type="button" variant="bordered" onPress={disable} isDisabled={action !== 'idle'}><Trash2 size={16} /><span>{action === 'disabling' ? 'Disabling...' : 'Disable QR Code'}</span></Button> : null}</div>
  </Card.Content></Card>;
}
