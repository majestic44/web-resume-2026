import { Button, Card, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { BriefcaseBusiness, Eye, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const progressOptions = [
  { id: '', label: 'Not set' },
  { id: 'planned', label: 'Planned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'on_hold', label: 'On Hold' }
];

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['â€™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function blankAsset(sortOrder = 0) {
  return {
    assetType: 'link',
    label: '',
    filePath: '',
    externalUrl: '',
    sortOrder
  };
}

function emptyCreateForm() {
  return {
    title: '',
    slug: '',
    summary: '',
    description: '',
    category: '',
    projectType: '',
    projectProgress: '',
    skillsText: '',
    visibility: 'public',
    featured: false,
    sortOrder: 0,
    assets: [blankAsset(0)]
  };
}

function skillsToText(skills) {
  return Array.isArray(skills) ? skills.join('\n') : '';
}

function getAssetHref(asset) {
  return asset?.externalUrl || asset?.filePath || '';
}

function getLeadImageAsset(assets) {
  return (assets || []).find(asset => asset.assetType === 'image' && getAssetHref(asset)) || null;
}

function getAssetSourceHint(assetType) {
  if (assetType === 'image') return 'The first image becomes the project card image on the public profile.';
  if (assetType === 'pdf') return 'Use a public PDF URL or file path visitors can open.';
  return 'Use a public link for GitHub, demos, references, or supporting material.';
}

function buildItemStates(items) {
  return items.reduce((map, item) => {
    map[item.id] = {
      title: item.title || '',
      slug: item.slug || '',
      summary: item.summary || '',
      description: item.description || '',
      category: item.category || '',
      projectType: item.projectType || item.category || '',
      projectProgress: item.projectProgress || '',
      skillsText: skillsToText(item.skills),
      visibility: item.visibility || 'private',
      featured: Boolean(item.featured),
      sortOrder: item.sortOrder ?? 0,
      assets: Array.isArray(item.assets) && item.assets.length
        ? item.assets.map((asset, index) => ({
            assetType: asset.assetType || 'link',
            label: asset.label || '',
            filePath: asset.filePath || '',
            externalUrl: asset.externalUrl || '',
            sortOrder: asset.sortOrder ?? index
          }))
        : [blankAsset(0)],
      saving: false,
      saved: false,
      deleting: false,
      error: ''
    };
    return map;
  }, {});
}

function portfolioFormToPayload(form) {
  return {
    title: form.title,
    slug: normalizeSlug(form.slug || form.title),
    summary: form.summary,
    description: form.description,
    category: form.category || form.projectType,
    projectType: form.projectType,
    projectProgress: form.projectProgress,
    skills: String(form.skillsText || '')
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean),
    visibility: form.visibility,
    featured: Boolean(form.featured),
    sortOrder: Number(form.sortOrder || 0),
    assets: (form.assets || [])
      .map((asset, index) => ({
        assetType: asset.assetType,
        label: asset.label,
        filePath: asset.filePath,
        externalUrl: asset.externalUrl,
        sortOrder: Number(asset.sortOrder ?? index)
      }))
      .filter(asset => asset.assetType && (asset.filePath || asset.externalUrl))
  };
}

function PortfolioAssetFields({ asset, index, onChange, onRemove }) {
  const assetHref = getAssetHref(asset);

  return (
    <div className="nested-card">
      <div className="nested-card-header">
        <h3>Asset {index + 1}</h3>
        <button type="button" onClick={onRemove}>
          <Trash2 size={16} />
          <span>Remove</span>
        </button>
      </div>
      <div className="form-grid two">
        <label className="select-field">
          <span>Asset Type</span>
          <select value={asset.assetType} onChange={event => onChange({ assetType: event.target.value })}>
            <option value="link">Link</option>
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        <TextField>
          <Label>Label</Label>
          <Input value={asset.label} onChange={event => onChange({ label: event.target.value })} />
        </TextField>
        <TextField>
          <Label>File Path</Label>
          <Input value={asset.filePath} onChange={event => onChange({ filePath: event.target.value })} />
        </TextField>
        <TextField>
          <Label>External URL</Label>
          <Input value={asset.externalUrl} onChange={event => onChange({ externalUrl: event.target.value })} />
        </TextField>
      </div>
      <p className="field-help">{getAssetSourceHint(asset.assetType)}</p>
      {asset.assetType === 'image' && assetHref ? (
        <div className="portfolio-asset-preview">
          <img src={assetHref} alt={asset.label || `Portfolio asset ${index + 1}`} loading="lazy" />
        </div>
      ) : null}
      {asset.assetType !== 'image' && assetHref ? (
        <a className="portfolio-asset-preview-link" href={assetHref} target="_blank" rel="noreferrer">
          <span>Preview current asset</span>
          <Eye size={16} />
        </a>
      ) : null}
    </div>
  );
}

function PortfolioAdvancedFields({ form, onPatch }) {
  return (
    <details className="portfolio-advanced-block">
      <summary>Advanced portfolio details</summary>
      <div className="portfolio-advanced-block__content">
        <p className="field-help">Only use these when you need manual ordering, a custom slug, or project-specific skill tags.</p>
        <div className="form-grid two">
          <TextField>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={event => onPatch({ slug: normalizeSlug(event.target.value) })} />
          </TextField>
          <TextField>
            <Label>Sort Order</Label>
            <Input type="number" value={String(form.sortOrder)} onChange={event => onPatch({ sortOrder: event.target.value })} />
          </TextField>
        </div>

        <TextField>
          <Label>Skills</Label>
          <TextArea rows={4} value={form.skillsText} onChange={event => onPatch({ skillsText: event.target.value })} />
          <p className="field-help">Optional. Add only skills that help explain this specific project.</p>
        </TextField>
      </div>
    </details>
  );
}

function PortfolioProjectCard({ item, state, onPatch, onAssetChange, onAssetAdd, onAssetRemove, onSave, onDelete }) {
  const leadImage = getLeadImageAsset(state.assets);

  return (
    <Card className="profile-card member-card">
      <Card.Content className="profile-card-content form-stack">
        <div className="portfolio-project-card__head">
          <div>
            <p className="card-label">{state.projectType || 'Project'}</p>
            <h2>{item.title}</h2>
            <p>{progressOptions.find(option => option.id === state.projectProgress)?.label || 'Progress not set'}</p>
          </div>
          {leadImage ? (
            <img
              className="portfolio-project-card__image"
              src={getAssetHref(leadImage)}
              alt={leadImage.label || item.title}
              loading="lazy"
            />
          ) : null}
        </div>

        <div className="form-grid two">
          <TextField>
            <Label>Title</Label>
            <Input
              value={state.title}
              onChange={event => onPatch({
                title: event.target.value,
                slug: state.slug ? state.slug : normalizeSlug(event.target.value),
                saved: false
              })}
            />
          </TextField>
          <TextField>
            <Label>Project Type</Label>
            <Input value={state.projectType} onChange={event => onPatch({ projectType: event.target.value, saved: false })} />
          </TextField>
          <label className="select-field">
            <span>Progress</span>
            <select value={state.projectProgress} onChange={event => onPatch({ projectProgress: event.target.value, saved: false })}>
              {progressOptions.map(option => <option key={option.id || 'none'} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="select-field">
            <span>Visibility</span>
            <select value={state.visibility} onChange={event => onPatch({ visibility: event.target.value, saved: false })}>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
          </label>
          <TextField>
            <Label>Short Summary</Label>
            <Input value={state.summary} onChange={event => onPatch({ summary: event.target.value, saved: false })} />
          </TextField>
        </div>

        <TextField>
          <Label>Description</Label>
          <TextArea rows={5} value={state.description} onChange={event => onPatch({ description: event.target.value, saved: false })} />
        </TextField>

        <label className="portfolio-checkbox">
          <input type="checkbox" checked={state.featured} onChange={event => onPatch({ featured: event.target.checked, saved: false })} />
          <span>Feature this project on the profile page</span>
        </label>

        <PortfolioAdvancedFields form={state} onPatch={patch => onPatch({ ...patch, saved: false })} />

        <div className="portfolio-assets-block">
          <div className="assignment-header">
            <strong>Project Assets</strong>
            <span>{state.assets.length} item{state.assets.length === 1 ? '' : 's'}</span>
          </div>
          <p className="field-help">Add the main image, supporting photos, and the links you want on the project card.</p>
          <div className="portfolio-assets-list">
            {state.assets.map((asset, index) => (
              <PortfolioAssetFields
                key={`${item.id}-asset-${index}`}
                asset={asset}
                index={index}
                onChange={patch => onAssetChange(index, patch)}
                onRemove={() => onAssetRemove(index)}
              />
            ))}
          </div>
          <Button type="button" variant="bordered" onPress={onAssetAdd}>
            <Plus size={16} />
            <span>Add Asset</span>
          </Button>
        </div>

        {state.saved ? <p className="editor-success">Project saved.</p> : null}
        {state.error ? <p className="editor-error">{state.error}</p> : null}

        <div className="toolbar">
          <Button type="button" onPress={onSave} isDisabled={state.saving || state.deleting}>
            <Save size={16} />
            <span>{state.saving ? 'Saving...' : 'Save Project'}</span>
          </Button>
          <Button type="button" variant="bordered" onPress={onDelete} isDisabled={state.saving || state.deleting}>
            <Trash2 size={16} />
            <span>{state.deleting ? 'Deleting...' : 'Delete Project'}</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}

export function PortfolioWorkspace({ authState, profile }) {
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

    fetch(`/api/admin/profiles/${profile.slug}/portfolio`)
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load portfolio items.');
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
    publicItems: items.filter(item => item.visibility === 'public').length,
    featured: items.filter(item => item.featured).length
  }), [items]);

  const updateCreateForm = patch => {
    setCreateForm(current => ({ ...current, ...patch }));
  };

  const updateCreateAsset = (index, patch) => {
    setCreateForm(current => ({
      ...current,
      assets: current.assets.map((asset, assetIndex) => (assetIndex === index ? { ...asset, ...patch } : asset))
    }));
  };

  const addCreateAsset = () => {
    setCreateForm(current => ({
      ...current,
      assets: [...current.assets, blankAsset(current.assets.length)]
    }));
  };

  const removeCreateAsset = index => {
    setCreateForm(current => ({
      ...current,
      assets: current.assets.filter((_, assetIndex) => assetIndex !== index)
    }));
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

  const updateItemAsset = (itemId, index, patch) => {
    updateItemState(itemId, {
      assets: (itemStates[itemId]?.assets || []).map((asset, assetIndex) => (assetIndex === index ? { ...asset, ...patch } : asset)),
      saved: false
    });
  };

  const addItemAsset = itemId => {
    updateItemState(itemId, {
      assets: [...(itemStates[itemId]?.assets || []), blankAsset((itemStates[itemId]?.assets || []).length)],
      saved: false
    });
  };

  const removeItemAsset = (itemId, index) => {
    updateItemState(itemId, {
      assets: (itemStates[itemId]?.assets || []).filter((_, assetIndex) => assetIndex !== index),
      saved: false
    });
  };

  const reloadItems = async () => {
    const response = await fetch(`/api/admin/profiles/${profile.slug}/portfolio`);
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
      const response = await fetch(`/api/admin/profiles/${profile.slug}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioFormToPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create project.');
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
      const response = await fetch(`/api/admin/profiles/${profile.slug}/portfolio/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioFormToPayload(state))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save project.');
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
    const confirmed = window.confirm(`Delete portfolio project "${item.title}"?`);
    if (!confirmed) return;

    updateItemState(item.id, { deleting: true, error: '', saved: false });

    try {
      const response = await fetch(`/api/admin/profiles/${profile.slug}/portfolio/${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete project.');
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
            <h2>Portfolio</h2>
            <p>
              {authState.dataSource !== 'database'
                ? 'Switch to database mode to manage portfolio projects from the editor.'
                : authState.user
                  ? 'This account does not currently have portfolio access for the selected profile.'
                  : 'Sign in with an editor, admin, or owner account to manage portfolio projects.'}
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
              <p className="card-label">Portfolio Project</p>
              <h2>Add a project card</h2>
              <p className="field-help">Each project becomes its own public card with a title, image, description, links, type, and progress.</p>
            </div>

            <div className="form-grid two">
              <TextField>
                <Label>Title</Label>
                <Input
                  value={createForm.title}
                  onChange={event => updateCreateForm({
                    title: event.target.value,
                    slug: createForm.slug ? createForm.slug : normalizeSlug(event.target.value)
                  })}
                />
              </TextField>
              <TextField>
                <Label>Project Type</Label>
                <Input value={createForm.projectType} onChange={event => updateCreateForm({ projectType: event.target.value })} />
              </TextField>
              <label className="select-field">
                <span>Progress</span>
                <select value={createForm.projectProgress} onChange={event => updateCreateForm({ projectProgress: event.target.value })}>
                  {progressOptions.map(option => <option key={option.id || 'none'} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="select-field">
                <span>Visibility</span>
                <select value={createForm.visibility} onChange={event => updateCreateForm({ visibility: event.target.value })}>
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <TextField>
                <Label>Short Summary</Label>
                <Input value={createForm.summary} onChange={event => updateCreateForm({ summary: event.target.value })} />
              </TextField>
            </div>

            <TextField>
              <Label>Description</Label>
              <TextArea rows={5} value={createForm.description} onChange={event => updateCreateForm({ description: event.target.value })} />
            </TextField>

            <label className="portfolio-checkbox">
              <input type="checkbox" checked={createForm.featured} onChange={event => updateCreateForm({ featured: event.target.checked })} />
              <span>Feature this project on the profile page</span>
            </label>

            <PortfolioAdvancedFields form={createForm} onPatch={updateCreateForm} />

            <div className="portfolio-assets-block">
              <div className="assignment-header">
                <strong>Project Assets</strong>
                <span>{createForm.assets.length} item{createForm.assets.length === 1 ? '' : 's'}</span>
              </div>
              <p className="field-help">Add at least one image if you want the project to appear as a visual gallery card.</p>
              <div className="portfolio-assets-list">
                {createForm.assets.map((asset, index) => (
                  <PortfolioAssetFields
                    key={`create-asset-${index}`}
                    asset={asset}
                    index={index}
                    onChange={patch => updateCreateAsset(index, patch)}
                    onRemove={() => removeCreateAsset(index)}
                  />
                ))}
              </div>
              <Button type="button" variant="bordered" onPress={addCreateAsset}>
                <Plus size={16} />
                <span>Add Asset</span>
              </Button>
            </div>

            <div className="toolbar">
              <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving'}>
                <Plus size={16} />
                <span>{createState === 'saving' ? 'Creating...' : 'Create Project'}</span>
              </Button>
              <a className="hero-link-button" href={publicProfileLink}>
                <Eye size={16} />
                <span>Public Profile Preview</span>
              </a>
              {createState === 'saved' ? <p className="editor-success">Project created.</p> : null}
            </div>
          </Card.Content>
        </Card>

        <Card className="members-summary-card">
          <Card.Content className="form-stack">
            <div>
              <p className="card-label">Portfolio Summary</p>
              <h2>{counts.total} project{counts.total === 1 ? '' : 's'}</h2>
              <p className="field-help">The first image on each project becomes the gallery image shown on the public profile page.</p>
            </div>
            <dl className="snapshot-list compact">
              <div>
                <dt>Public</dt>
                <dd>{counts.publicItems}</dd>
              </div>
              <div>
                <dt>Featured</dt>
                <dd>{counts.featured}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{profile?.name || profile?.displayName || profile?.slug}</dd>
              </div>
            </dl>
            <a className="portfolio-summary-link" href={publicProfileLink}>
              <span>Open public profile</span>
              <ExternalLink size={14} />
            </a>
          </Card.Content>
        </Card>
      </section>

      <section className="profiles-admin-grid portfolio-admin-grid" aria-label="Portfolio projects">
        {status === 'loading' ? (
          <div className="loading-row">
            <Spinner size="sm" />
            <p>Loading portfolio projects...</p>
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <Card className="profile-card member-card portfolio-empty-card">
            <Card.Content className="profile-card-content form-stack">
              <div>
                <p className="card-label">No Projects Yet</p>
                <h2>Build the gallery</h2>
                <p>Create the first portfolio card for this profile using the form above.</p>
              </div>
            </Card.Content>
          </Card>
        ) : null}

        {items.map(item => {
          const state = itemStates[item.id];
          if (!state) return null;

          return (
            <PortfolioProjectCard
              key={item.id}
              item={item}
              state={state}
              onPatch={patch => updateItemState(item.id, patch)}
              onAssetChange={(index, patch) => updateItemAsset(item.id, index, patch)}
              onAssetAdd={() => addItemAsset(item.id)}
              onAssetRemove={index => removeItemAsset(item.id, index)}
              onSave={() => handleSave(item)}
              onDelete={() => handleDelete(item)}
            />
          );
        })}
      </section>
    </section>
  );
}
