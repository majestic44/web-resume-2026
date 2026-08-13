import { Button, Card, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { Award, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const statusOptions = [
  { id: 'active', label: 'Active' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'expired', label: 'Expired' }
];

function emptyCreateForm() {
  return {
    title: '',
    issuer: '',
    status: 'active',
    issuedOn: '',
    expiresOn: '',
    credentialId: '',
    credentialUrl: '',
    notes: '',
    sortOrder: 0
  };
}

function buildItemStates(items) {
  return items.reduce((map, item) => {
    map[item.id] = {
      title: item.title || '',
      issuer: item.issuer || '',
      status: item.status || 'active',
      issuedOn: item.issuedOn || '',
      expiresOn: item.expiresOn || '',
      credentialId: item.credentialId || '',
      credentialUrl: item.credentialUrl || '',
      notes: item.notes || '',
      sortOrder: item.sortOrder ?? 0,
      saving: false,
      saved: false,
      deleting: false,
      error: ''
    };
    return map;
  }, {});
}

function certificationPayload(form) {
  return {
    title: form.title,
    issuer: form.issuer,
    status: form.status,
    issuedOn: form.issuedOn,
    expiresOn: form.expiresOn,
    credentialId: form.credentialId,
    credentialUrl: form.credentialUrl,
    notes: form.notes,
    sortOrder: Number(form.sortOrder || 0)
  };
}

function formatStatusLabel(value) {
  return statusOptions.find(option => option.id === value)?.label || 'Active';
}

function formatDateValue(value) {
  if (!value) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function CertificationCard({ item, state, onPatch, onSave, onDelete }) {
  return (
    <Card className="profile-card member-card certification-card">
      <Card.Content className="profile-card-content form-stack">
        <div className="certification-card__head">
          <div className="certification-card__icon">
            <Award size={18} />
          </div>
          <div>
            <p className="card-label">{formatStatusLabel(state.status)}</p>
            <h2>{state.title || item.title}</h2>
            <p>{state.issuer || item.issuer}</p>
            <div className="certification-card__meta">
              <span>Issued: {formatDateValue(state.issuedOn)}</span>
              {state.expiresOn ? <span>Expires: {formatDateValue(state.expiresOn)}</span> : null}
            </div>
          </div>
        </div>

        <div className="form-grid two">
          <TextField>
            <Label>Certification Title</Label>
            <Input value={state.title} onChange={event => onPatch({ title: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Issuer</Label>
            <Input value={state.issuer} onChange={event => onPatch({ issuer: event.target.value, saved: false })} />
          </TextField>
          <label className="select-field">
            <span>Status</span>
            <select value={state.status} onChange={event => onPatch({ status: event.target.value, saved: false })}>
              {statusOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <TextField>
            <Label>Sort Order</Label>
            <Input type="number" value={String(state.sortOrder)} onChange={event => onPatch({ sortOrder: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Issued On</Label>
            <Input type="date" value={state.issuedOn} onChange={event => onPatch({ issuedOn: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Expires On</Label>
            <Input type="date" value={state.expiresOn} onChange={event => onPatch({ expiresOn: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Credential ID</Label>
            <Input value={state.credentialId} onChange={event => onPatch({ credentialId: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Verification URL</Label>
            <Input value={state.credentialUrl} onChange={event => onPatch({ credentialUrl: event.target.value, saved: false })} />
          </TextField>
        </div>

        <TextField>
          <Label>Notes</Label>
          <TextArea rows={4} value={state.notes} onChange={event => onPatch({ notes: event.target.value, saved: false })} />
          <p className="field-help">Use notes for context like specialization, scope, or renewal details.</p>
        </TextField>

        {state.credentialUrl ? (
          <a className="portfolio-summary-link" href={state.credentialUrl} target="_blank" rel="noreferrer">
            <span>Open verification link</span>
            <ExternalLink size={14} />
          </a>
        ) : null}

        {state.saved ? <p className="editor-success">Certification saved.</p> : null}
        {state.error ? <p className="editor-error">{state.error}</p> : null}

        <div className="toolbar">
          <Button type="button" onPress={onSave} isDisabled={state.saving || state.deleting}>
            <Save size={16} />
            <span>{state.saving ? 'Saving...' : 'Save Certification'}</span>
          </Button>
          <Button type="button" variant="bordered" onPress={onDelete} isDisabled={state.saving || state.deleting}>
            <Trash2 size={16} />
            <span>{state.deleting ? 'Deleting...' : 'Delete Certification'}</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}

export function CertificationsWorkspace({ authState, profile }) {
  const [items, setItems] = useState([]);
  const [itemStates, setItemStates] = useState({});
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [createState, setCreateState] = useState('idle');

  const canManage = authState.dataSource === 'database'
    && ['owner', 'admin', 'editor'].includes(authState.user?.role)
    && Boolean(profile?.slug)
    && (authState.user?.editableProfiles?.includes('*') || authState.user?.editableProfiles?.includes(profile?.slug));

  const publicProfileLink = profile?.profileLink || `/profile/${profile?.slug || ''}`;

  useEffect(() => {
    if (!profile?.slug || !canManage) {
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError('');

    fetch(`/api/admin/profiles/${profile.slug}/certifications`)
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load certifications.');
        }

        return response.json();
      })
      .then(payload => {
        const nextItems = payload.items || [];
        setItems(nextItems);
        setItemStates(buildItemStates(nextItems));
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canManage, profile?.slug]);

  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter(item => item.status === 'active').length,
    inProgress: items.filter(item => item.status === 'in_progress').length,
    expired: items.filter(item => item.status === 'expired').length
  }), [items]);

  const updateCreateForm = patch => {
    setCreateForm(current => ({ ...current, ...patch }));
  };

  const updateItemState = (itemId, patch) => {
    setItemStates(current => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        ...patch
      }
    }));
  };

  const reloadItems = async () => {
    const response = await fetch(`/api/admin/profiles/${profile.slug}/certifications`);
    const payload = response.ok ? await response.json() : { items: [] };
    const nextItems = payload.items || [];
    setItems(nextItems);
    setItemStates(buildItemStates(nextItems));
  };

  const handleCreate = async () => {
    if (!profile?.slug) return;

    setCreateState('saving');
    setError('');

    try {
      const response = await fetch(`/api/admin/profiles/${profile.slug}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certificationPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create certification.');
      }

      await reloadItems();
      setCreateForm(emptyCreateForm());
      setCreateState('saved');
    } catch (createError) {
      setError(createError.message);
      setCreateState('error');
    }
  };

  const handleSave = async item => {
    const state = itemStates[item.id];
    if (!state) return;

    updateItemState(item.id, { saving: true, saved: false, error: '' });

    try {
      const response = await fetch(`/api/admin/profiles/${profile.slug}/certifications/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certificationPayload(state))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save certification.');
      }

      const nextItems = items.map(entry => (entry.id === item.id ? payload.item : entry));
      const nextStates = buildItemStates(nextItems);
      nextStates[item.id] = {
        ...nextStates[item.id],
        saved: true
      };
      setItems(nextItems);
      setItemStates(nextStates);
    } catch (saveError) {
      updateItemState(item.id, { saving: false, saved: false, error: saveError.message });
    }
  };

  const handleDelete = async item => {
    const confirmed = window.confirm(`Delete certification "${item.title}"?`);
    if (!confirmed) return;

    updateItemState(item.id, { deleting: true, error: '', saved: false });

    try {
      const response = await fetch(`/api/admin/profiles/${profile.slug}/certifications/${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete certification.');
      }

      const nextItems = items.filter(entry => entry.id !== item.id);
      setItems(nextItems);
      setItemStates(buildItemStates(nextItems));
    } catch (deleteError) {
      updateItemState(item.id, { deleting: false, error: deleteError.message });
    }
  };

  if (!canManage) {
    return (
      <Card className="form-panel editor-panel">
        <Card.Content className="form-stack">
          <div className="editor-section-heading">
            <h2>Certifications</h2>
            <p>
              {authState.dataSource !== 'database'
                ? 'Switch to database mode to manage certifications and licenses from the editor.'
                : authState.user
                  ? 'This account does not currently have certification access for the selected profile.'
                  : 'Sign in with an editor, admin, or owner account to manage certifications.'}
            </p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <section className="portfolio-workspace">
      {error ? <p className="editor-error">{error}</p> : null}

      <section className="members-layout">
        <Card className="form-panel members-create-panel">
          <Card.Content className="form-stack">
            <div>
              <p className="card-label">Certification</p>
              <h2>Add a certification or license</h2>
              <p className="field-help">Track professional certifications, licenses, safety credentials, and training records for the selected profile.</p>
            </div>

            <div className="form-grid two">
              <TextField>
                <Label>Certification Title</Label>
                <Input value={createForm.title} onChange={event => updateCreateForm({ title: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Issuer</Label>
                <Input value={createForm.issuer} onChange={event => updateCreateForm({ issuer: event.target.value })} />
              </TextField>
              <label className="select-field">
                <span>Status</span>
                <select value={createForm.status} onChange={event => updateCreateForm({ status: event.target.value })}>
                  {statusOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <TextField>
                <Label>Sort Order</Label>
                <Input type="number" value={String(createForm.sortOrder)} onChange={event => updateCreateForm({ sortOrder: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Issued On</Label>
                <Input type="date" value={createForm.issuedOn} onChange={event => updateCreateForm({ issuedOn: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Expires On</Label>
                <Input type="date" value={createForm.expiresOn} onChange={event => updateCreateForm({ expiresOn: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Credential ID</Label>
                <Input value={createForm.credentialId} onChange={event => updateCreateForm({ credentialId: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Verification URL</Label>
                <Input value={createForm.credentialUrl} onChange={event => updateCreateForm({ credentialUrl: event.target.value })} />
              </TextField>
            </div>

            <TextField>
              <Label>Notes</Label>
              <TextArea rows={4} value={createForm.notes} onChange={event => updateCreateForm({ notes: event.target.value })} />
              <p className="field-help">Optional. Add details like specialization, renewal requirements, or scope of the credential.</p>
            </TextField>

            <div className="toolbar">
              <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving'}>
                <Plus size={16} />
                <span>{createState === 'saving' ? 'Creating...' : 'Create Certification'}</span>
              </Button>
              <a className="hero-link-button" href={publicProfileLink}>
                <ExternalLink size={16} />
                <span>Public Profile Preview</span>
              </a>
              {createState === 'saved' ? <p className="editor-success">Certification created.</p> : null}
            </div>
          </Card.Content>
        </Card>

        <Card className="members-summary-card">
          <Card.Content className="form-stack">
            <div>
              <p className="card-label">Certification Summary</p>
              <h2>{counts.total} item{counts.total === 1 ? '' : 's'}</h2>
              <p className="field-help">Use this workspace for licenses, certifications, permits, and training credentials tied to the selected profile.</p>
            </div>
            <dl className="snapshot-list compact">
              <div>
                <dt>Active</dt>
                <dd>{counts.active}</dd>
              </div>
              <div>
                <dt>In Progress</dt>
                <dd>{counts.inProgress}</dd>
              </div>
              <div>
                <dt>Expired</dt>
                <dd>{counts.expired}</dd>
              </div>
            </dl>
          </Card.Content>
        </Card>
      </section>

      <section className="profiles-admin-grid certification-admin-grid" aria-label="Certifications">
        {status === 'loading' ? (
          <div className="loading-row">
            <Spinner size="sm" />
            <p>Loading certifications...</p>
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <Card className="profile-card member-card portfolio-empty-card">
            <Card.Content className="profile-card-content form-stack">
              <div>
                <p className="card-label">No Certifications Yet</p>
                <h2>Build the credential section</h2>
                <p>Create the first certification or license for this profile using the form above.</p>
              </div>
            </Card.Content>
          </Card>
        ) : null}

        {items.map(item => {
          const state = itemStates[item.id];
          if (!state) return null;

          return (
            <CertificationCard
              key={item.id}
              item={item}
              state={state}
              onPatch={patch => updateItemState(item.id, patch)}
              onSave={() => handleSave(item)}
              onDelete={() => handleDelete(item)}
            />
          );
        })}
      </section>
    </section>
  );
}
