import { Button, Card, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { ExternalLink, Mail, Phone, Plus, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function emptyCreateForm() {
  return {
    name: '',
    title: '',
    company: '',
    relationshipLabel: '',
    email: '',
    phone: '',
    referenceText: '',
    contactNote: '',
    sortOrder: 0
  };
}

function buildItemStates(items) {
  return items.reduce((map, item) => {
    map[item.id] = {
      name: item.name || '',
      title: item.title || '',
      company: item.company || '',
      relationshipLabel: item.relationshipLabel || '',
      email: item.email || '',
      phone: item.phone || '',
      referenceText: item.referenceText || '',
      contactNote: item.contactNote || '',
      sortOrder: item.sortOrder ?? 0,
      saving: false,
      saved: false,
      deleting: false,
      error: ''
    };
    return map;
  }, {});
}

function referencePayload(form) {
  return {
    name: form.name,
    title: form.title,
    company: form.company,
    relationshipLabel: form.relationshipLabel,
    email: form.email,
    phone: form.phone,
    referenceText: form.referenceText,
    contactNote: form.contactNote,
    sortOrder: Number(form.sortOrder || 0)
  };
}

function referenceSubhead(state, item) {
  const title = state.title || item.title;
  const company = state.company || item.company;
  return [title, company].filter(Boolean).join(' • ');
}

function ReferenceCard({ item, state, onPatch, onSave, onDelete }) {
  return (
    <Card className="profile-card member-card certification-card">
      <Card.Content className="profile-card-content form-stack">
        <div className="certification-card__head">
          <div className="certification-card__icon">
            <Users size={18} />
          </div>
          <div>
            <p className="card-label">{state.relationshipLabel || item.relationshipLabel || 'Professional Reference'}</p>
            <h2>{state.name || item.name}</h2>
            {referenceSubhead(state, item) ? <p>{referenceSubhead(state, item)}</p> : null}
          </div>
        </div>

        <div className="form-grid two">
          <TextField>
            <Label>Reference Name</Label>
            <Input value={state.name} onChange={event => onPatch({ name: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Relationship</Label>
            <Input value={state.relationshipLabel} onChange={event => onPatch({ relationshipLabel: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Title</Label>
            <Input value={state.title} onChange={event => onPatch({ title: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Company</Label>
            <Input value={state.company} onChange={event => onPatch({ company: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Email</Label>
            <Input value={state.email} onChange={event => onPatch({ email: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Phone</Label>
            <Input value={state.phone} onChange={event => onPatch({ phone: event.target.value, saved: false })} />
          </TextField>
          <TextField>
            <Label>Sort Order</Label>
            <Input type="number" value={String(state.sortOrder)} onChange={event => onPatch({ sortOrder: event.target.value, saved: false })} />
          </TextField>
        </div>

        <TextField>
          <Label>Reference Summary</Label>
          <TextArea rows={4} value={state.referenceText} onChange={event => onPatch({ referenceText: event.target.value, saved: false })} />
          <p className="field-help">Use this for a short recommendation, credibility note, or summary of the working relationship.</p>
        </TextField>

        <TextField>
          <Label>Contact Note</Label>
          <TextArea rows={3} value={state.contactNote} onChange={event => onPatch({ contactNote: event.target.value, saved: false })} />
          <p className="field-help">Optional. Add contact guidance such as preferred hours or availability upon request.</p>
        </TextField>

        <div className="portfolio-card__assets">
          {state.email ? (
            <a className="portfolio-card__asset-link" href={`mailto:${state.email}`}>
              <span className="portfolio-card__asset-main">
                <span className="portfolio-card__asset-kind">Email</span>
                <strong>{state.email}</strong>
              </span>
              <Mail size={15} />
            </a>
          ) : null}
          {state.phone ? (
            <a className="portfolio-card__asset-link" href={`tel:${state.phone}`}>
              <span className="portfolio-card__asset-main">
                <span className="portfolio-card__asset-kind">Phone</span>
                <strong>{state.phone}</strong>
              </span>
              <Phone size={15} />
            </a>
          ) : null}
        </div>

        {state.saved ? <p className="editor-success">Reference saved.</p> : null}
        {state.error ? <p className="editor-error">{state.error}</p> : null}

        <div className="toolbar">
          <Button type="button" onPress={onSave} isDisabled={state.saving || state.deleting}>
            <Save size={16} />
            <span>{state.saving ? 'Saving...' : 'Save Reference'}</span>
          </Button>
          <Button type="button" variant="bordered" onPress={onDelete} isDisabled={state.saving || state.deleting}>
            <Trash2 size={16} />
            <span>{state.deleting ? 'Deleting...' : 'Delete Reference'}</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}

export function ReferencesWorkspace({ authState, profile }) {
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

    fetch(`/api/admin/profiles/${profile.slug}/references`)
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load references.');
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
    withEmail: items.filter(item => item.email).length,
    withPhone: items.filter(item => item.phone).length
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
    const response = await fetch(`/api/admin/profiles/${profile.slug}/references`);
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
      const response = await fetch(`/api/admin/profiles/${profile.slug}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(referencePayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create reference.');
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
      const response = await fetch(`/api/admin/profiles/${profile.slug}/references/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(referencePayload(state))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save reference.');
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
    const confirmed = window.confirm(`Delete reference "${item.name}"?`);
    if (!confirmed) return;

    updateItemState(item.id, { deleting: true, error: '', saved: false });

    try {
      const response = await fetch(`/api/admin/profiles/${profile.slug}/references/${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete reference.');
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
            <h2>References</h2>
            <p>
              {authState.dataSource !== 'database'
                ? 'Switch to database mode to manage references from the editor.'
                : authState.user
                  ? 'This account does not currently have reference access for the selected profile.'
                  : 'Sign in with an editor, admin, or owner account to manage references.'}
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
              <p className="card-label">Reference</p>
              <h2>Add a professional reference</h2>
              <p className="field-help">Store names, titles, relationship context, contact details, and recommendation notes for the selected profile.</p>
            </div>

            <div className="form-grid two">
              <TextField>
                <Label>Reference Name</Label>
                <Input value={createForm.name} onChange={event => updateCreateForm({ name: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Relationship</Label>
                <Input value={createForm.relationshipLabel} onChange={event => updateCreateForm({ relationshipLabel: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Title</Label>
                <Input value={createForm.title} onChange={event => updateCreateForm({ title: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Company</Label>
                <Input value={createForm.company} onChange={event => updateCreateForm({ company: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Email</Label>
                <Input value={createForm.email} onChange={event => updateCreateForm({ email: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Phone</Label>
                <Input value={createForm.phone} onChange={event => updateCreateForm({ phone: event.target.value })} />
              </TextField>
              <TextField>
                <Label>Sort Order</Label>
                <Input type="number" value={String(createForm.sortOrder)} onChange={event => updateCreateForm({ sortOrder: event.target.value })} />
              </TextField>
            </div>

            <TextField>
              <Label>Reference Summary</Label>
              <TextArea rows={4} value={createForm.referenceText} onChange={event => updateCreateForm({ referenceText: event.target.value })} />
              <p className="field-help">Optional. Add a short recommendation, endorsement, or project context.</p>
            </TextField>

            <TextField>
              <Label>Contact Note</Label>
              <TextArea rows={3} value={createForm.contactNote} onChange={event => updateCreateForm({ contactNote: event.target.value })} />
              <p className="field-help">Optional. Note preferred contact method, timing, or whether the reference is available on request.</p>
            </TextField>

            <div className="toolbar">
              <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving'}>
                <Plus size={16} />
                <span>{createState === 'saving' ? 'Creating...' : 'Create Reference'}</span>
              </Button>
              <a className="hero-link-button" href={publicProfileLink}>
                <ExternalLink size={16} />
                <span>Public Profile Preview</span>
              </a>
              {createState === 'saved' ? <p className="editor-success">Reference created.</p> : null}
            </div>
          </Card.Content>
        </Card>

        <Card className="members-summary-card">
          <Card.Content className="form-stack">
            <div>
              <p className="card-label">Reference Summary</p>
              <h2>{counts.total} item{counts.total === 1 ? '' : 's'}</h2>
              <p className="field-help">References can be used for public endorsements, recommendation blurbs, or recruiter-ready contact details.</p>
            </div>
            <dl className="snapshot-list compact">
              <div>
                <dt>With Email</dt>
                <dd>{counts.withEmail}</dd>
              </div>
              <div>
                <dt>With Phone</dt>
                <dd>{counts.withPhone}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{counts.total}</dd>
              </div>
            </dl>
          </Card.Content>
        </Card>
      </section>

      <section className="profiles-admin-grid certification-admin-grid" aria-label="References">
        {status === 'loading' ? (
          <div className="loading-row">
            <Spinner size="sm" />
            <p>Loading references...</p>
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <Card className="profile-card member-card portfolio-empty-card">
            <Card.Content className="profile-card-content form-stack">
              <div>
                <p className="card-label">No References Yet</p>
                <h2>Build the references section</h2>
                <p>Create the first professional reference for this profile using the form above.</p>
              </div>
            </Card.Content>
          </Card>
        ) : null}

        {items.map(item => {
          const state = itemStates[item.id];
          if (!state) return null;

          return (
            <ReferenceCard
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
