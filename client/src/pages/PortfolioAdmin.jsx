import { Alert, Button, Card, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { Eye, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
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

function buildItemStates(items) {
  return items.reduce((map, item) => {
    map[item.id] = {
      title: item.title || '',
      slug: item.slug || '',
      summary: item.summary || '',
      description: item.description || '',
      category: item.category || '',
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
    category: form.category,
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

export function PortfolioAdmin({ authState }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [items, setItems] = useState([]);
  const [itemStates, setItemStates] = useState({});
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [createState, setCreateState] = useState('idle');

  const canManage = authState.dataSource === 'database' && ['owner', 'admin', 'editor'].includes(authState.user?.role);

  useEffect(() => {
    setError('');

    fetch('/api/profiles')
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
      return;
    }

    setStatus('loading');
    setError('');

    fetch(`/api/admin/profiles/${selectedSlug}/portfolio`)
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
  }, [canManage, selectedSlug]);

  const selectedProfile = profiles.find(profile => profile.slug === selectedSlug);

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

  const reloadItems = async slug => {
    const response = await fetch(`/api/admin/profiles/${slug}/portfolio`);
    const payload = response.ok ? await response.json() : { items: [] };
    const nextItems = payload.items || [];
    setItems(nextItems);
    setItemStates(buildItemStates(nextItems));
  };

  const handleCreate = async () => {
    if (!selectedSlug) return;

    setCreateState('saving');
    setError('');

    try {
      const response = await fetch(`/api/admin/profiles/${selectedSlug}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioFormToPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create portfolio item.');
      }

      await reloadItems(selectedSlug);
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
      const response = await fetch(`/api/admin/profiles/${selectedSlug}/portfolio/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioFormToPayload(state))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save portfolio item.');
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
    const confirmed = window.confirm(`Delete portfolio item "${item.title}"?`);
    if (!confirmed) return;

    updateItemState(item.id, { deleting: true, error: '', saved: false });

    try {
      const response = await fetch(`/api/admin/profiles/${selectedSlug}/portfolio/${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to delete portfolio item.');
      }

      const nextItems = items.filter(entry => entry.id !== item.id);
      setItems(nextItems);
      setItemStates(buildItemStates(nextItems));
    } catch (deleteError) {
      updateItemState(item.id, { deleting: false, error: deleteError.message });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Portfolio management">
        <p>
          {canManage
            ? 'Create public work samples, project highlights, and supporting links for each household profile.'
            : authState.dataSource !== 'database'
              ? 'Switch to database mode to manage portfolio items from the CMS.'
              : authState.user
                ? 'This account does not currently have portfolio editing access.'
                : 'Sign in with an editor, admin, or owner account to manage portfolio items.'}
        </p>
      </PageHeader>

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Portfolio management error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {!canManage ? null : (
        <>
          <section className="members-layout">
            <Card className="form-panel members-create-panel">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Create Portfolio Item</p>
                  <h2>Add a public work sample</h2>
                  <p className="field-help">Choose a profile, describe the project or work sample, and attach public links or file paths.</p>
                </div>

                <div className="form-grid two">
                  <label className="select-field">
                    <span>Profile</span>
                    <select value={selectedSlug} onChange={event => setSelectedSlug(event.target.value)}>
                      {editableProfiles.map(profile => <option key={profile.slug} value={profile.slug}>{profile.name}</option>)}
                    </select>
                  </label>
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
                    <Label>Slug</Label>
                    <Input value={createForm.slug} onChange={event => updateCreateForm({ slug: normalizeSlug(event.target.value) })} />
                  </TextField>
                  <TextField>
                    <Label>Category</Label>
                    <Input value={createForm.category} onChange={event => updateCreateForm({ category: event.target.value })} />
                  </TextField>
                  <TextField>
                    <Label>Summary</Label>
                    <Input value={createForm.summary} onChange={event => updateCreateForm({ summary: event.target.value })} />
                  </TextField>
                  <label className="select-field">
                    <span>Visibility</span>
                    <select value={createForm.visibility} onChange={event => updateCreateForm({ visibility: event.target.value })}>
                      <option value="private">Private</option>
                      <option value="shared">Shared</option>
                      <option value="public">Public</option>
                    </select>
                  </label>
                  <TextField>
                    <Label>Sort Order</Label>
                    <Input type="number" value={String(createForm.sortOrder)} onChange={event => updateCreateForm({ sortOrder: event.target.value })} />
                  </TextField>
                </div>

                <TextField>
                  <Label>Description</Label>
                  <TextArea rows={5} value={createForm.description} onChange={event => updateCreateForm({ description: event.target.value })} />
                </TextField>

                <TextField>
                  <Label>Skills</Label>
                  <TextArea rows={4} value={createForm.skillsText} onChange={event => updateCreateForm({ skillsText: event.target.value })} />
                  <p className="field-help">One skill per line, or separate skills with commas.</p>
                </TextField>

                <label className="portfolio-checkbox">
                  <input
                    type="checkbox"
                    checked={createForm.featured}
                    onChange={event => updateCreateForm({ featured: event.target.checked })}
                  />
                  <span>Feature this portfolio item</span>
                </label>

                <div className="portfolio-assets-block">
                  <div className="assignment-header">
                    <strong>Assets</strong>
                    <span>{createForm.assets.length} item{createForm.assets.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="portfolio-assets-list">
                    {createForm.assets.map((asset, index) => (
                      <div className="nested-card" key={`create-asset-${index}`}>
                        <div className="nested-card-header">
                          <h3>Asset {index + 1}</h3>
                          <button type="button" onClick={() => removeCreateAsset(index)}>
                            <Trash2 size={16} />
                            <span>Remove</span>
                          </button>
                        </div>
                        <div className="form-grid two">
                          <label className="select-field">
                            <span>Asset Type</span>
                            <select value={asset.assetType} onChange={event => updateCreateAsset(index, { assetType: event.target.value })}>
                              <option value="link">Link</option>
                              <option value="image">Image</option>
                              <option value="pdf">PDF</option>
                            </select>
                          </label>
                          <TextField>
                            <Label>Label</Label>
                            <Input value={asset.label} onChange={event => updateCreateAsset(index, { label: event.target.value })} />
                          </TextField>
                          <TextField>
                            <Label>File Path</Label>
                            <Input value={asset.filePath} onChange={event => updateCreateAsset(index, { filePath: event.target.value })} />
                          </TextField>
                          <TextField>
                            <Label>External URL</Label>
                            <Input value={asset.externalUrl} onChange={event => updateCreateAsset(index, { externalUrl: event.target.value })} />
                          </TextField>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="bordered" onPress={addCreateAsset}>
                    <Plus size={16} />
                    <span>Add Asset</span>
                  </Button>
                </div>

                <div className="toolbar">
                  <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving' || !selectedSlug}>
                    <Plus size={16} />
                    <span>{createState === 'saving' ? 'Creating...' : 'Create Portfolio Item'}</span>
                  </Button>
                  {selectedProfile ? (
                    <a className="hero-link-button" href={selectedProfile.profileLink || `/profile/${selectedProfile.slug}`}>
                      <Eye size={16} />
                      <span>Public Profile Preview</span>
                    </a>
                  ) : null}
                  {createState === 'saved' ? <p className="editor-success">Portfolio item created.</p> : null}
                </div>
              </Card.Content>
            </Card>

            <Card className="members-summary-card">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Portfolio Summary</p>
                  <h2>{items.length} item{items.length === 1 ? '' : 's'}</h2>
                  <p className="field-help">Public profile hubs can now surface project highlights, links, and supporting assets.</p>
                </div>
                <dl className="snapshot-list compact">
                  <div>
                    <dt>Public</dt>
                    <dd>{items.filter(item => item.visibility === 'public').length}</dd>
                  </div>
                  <div>
                    <dt>Featured</dt>
                    <dd>{items.filter(item => item.featured).length}</dd>
                  </div>
                  <div>
                    <dt>Assets</dt>
                    <dd>{items.reduce((total, item) => total + (item.assets?.length || 0), 0)}</dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
          </section>

          <section className="profiles-admin-grid portfolio-admin-grid" aria-label="Portfolio items">
            {status === 'loading' ? (
              <div className="loading-row">
                <Spinner size="sm" />
                <p>Loading portfolio items...</p>
              </div>
            ) : null}

            {status === 'ready' && items.length === 0 ? (
              <Card className="profile-card member-card portfolio-empty-card">
                <Card.Content className="profile-card-content form-stack">
                  <div>
                    <p className="card-label">No Items Yet</p>
                    <h2>Start the portfolio</h2>
                    <p>Create the first public work sample for this profile using the form above.</p>
                  </div>
                </Card.Content>
              </Card>
            ) : null}

            {items.map(item => {
              const state = itemStates[item.id];
              if (!state) return null;

              return (
                <Card className="profile-card member-card" key={item.id}>
                  <Card.Content className="profile-card-content form-stack">
                    <div>
                      <p className="card-label">{state.visibility}</p>
                      <h2>{item.title}</h2>
                      <p>{item.category || 'Portfolio item'}</p>
                    </div>

                    <div className="form-grid two">
                      <TextField>
                        <Label>Title</Label>
                        <Input
                          value={state.title}
                          onChange={event => updateItemState(item.id, {
                            title: event.target.value,
                            slug: state.slug ? state.slug : normalizeSlug(event.target.value),
                            saved: false
                          })}
                        />
                      </TextField>
                      <TextField>
                        <Label>Slug</Label>
                        <Input
                          value={state.slug}
                          onChange={event => updateItemState(item.id, { slug: normalizeSlug(event.target.value), saved: false })}
                        />
                      </TextField>
                      <TextField>
                        <Label>Category</Label>
                        <Input
                          value={state.category}
                          onChange={event => updateItemState(item.id, { category: event.target.value, saved: false })}
                        />
                      </TextField>
                      <label className="select-field">
                        <span>Visibility</span>
                        <select
                          value={state.visibility}
                          onChange={event => updateItemState(item.id, { visibility: event.target.value, saved: false })}
                        >
                          <option value="private">Private</option>
                          <option value="shared">Shared</option>
                          <option value="public">Public</option>
                        </select>
                      </label>
                      <TextField>
                        <Label>Summary</Label>
                        <Input
                          value={state.summary}
                          onChange={event => updateItemState(item.id, { summary: event.target.value, saved: false })}
                        />
                      </TextField>
                      <TextField>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={String(state.sortOrder)}
                          onChange={event => updateItemState(item.id, { sortOrder: event.target.value, saved: false })}
                        />
                      </TextField>
                    </div>

                    <TextField>
                      <Label>Description</Label>
                      <TextArea rows={5} value={state.description} onChange={event => updateItemState(item.id, { description: event.target.value, saved: false })} />
                    </TextField>

                    <TextField>
                      <Label>Skills</Label>
                      <TextArea rows={4} value={state.skillsText} onChange={event => updateItemState(item.id, { skillsText: event.target.value, saved: false })} />
                    </TextField>

                    <label className="portfolio-checkbox">
                      <input
                        type="checkbox"
                        checked={state.featured}
                        onChange={event => updateItemState(item.id, { featured: event.target.checked, saved: false })}
                      />
                      <span>Feature this portfolio item</span>
                    </label>

                    <div className="portfolio-assets-block">
                      <div className="assignment-header">
                        <strong>Assets</strong>
                        <span>{state.assets.length} item{state.assets.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="portfolio-assets-list">
                        {state.assets.map((asset, index) => (
                          <div className="nested-card" key={`${item.id}-asset-${index}`}>
                            <div className="nested-card-header">
                              <h3>Asset {index + 1}</h3>
                              <button type="button" onClick={() => removeItemAsset(item.id, index)}>
                                <Trash2 size={16} />
                                <span>Remove</span>
                              </button>
                            </div>
                            <div className="form-grid two">
                              <label className="select-field">
                                <span>Asset Type</span>
                                <select value={asset.assetType} onChange={event => updateItemAsset(item.id, index, { assetType: event.target.value })}>
                                  <option value="link">Link</option>
                                  <option value="image">Image</option>
                                  <option value="pdf">PDF</option>
                                </select>
                              </label>
                              <TextField>
                                <Label>Label</Label>
                                <Input value={asset.label} onChange={event => updateItemAsset(item.id, index, { label: event.target.value })} />
                              </TextField>
                              <TextField>
                                <Label>File Path</Label>
                                <Input value={asset.filePath} onChange={event => updateItemAsset(item.id, index, { filePath: event.target.value })} />
                              </TextField>
                              <TextField>
                                <Label>External URL</Label>
                                <Input value={asset.externalUrl} onChange={event => updateItemAsset(item.id, index, { externalUrl: event.target.value })} />
                              </TextField>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button type="button" variant="bordered" onPress={() => addItemAsset(item.id)}>
                        <Plus size={16} />
                        <span>Add Asset</span>
                      </Button>
                    </div>

                    {state.saved ? <p className="editor-success">Portfolio item saved.</p> : null}
                    {state.error ? <p className="editor-error">{state.error}</p> : null}

                    <div className="toolbar">
                      <Button type="button" onPress={() => handleSave(item)} isDisabled={state.saving || state.deleting}>
                        <Save size={16} />
                        <span>{state.saving ? 'Saving...' : 'Save Item'}</span>
                      </Button>
                      <Button type="button" variant="bordered" onPress={() => handleDelete(item)} isDisabled={state.saving || state.deleting}>
                        <Trash2 size={16} />
                        <span>{state.deleting ? 'Deleting...' : 'Delete Item'}</span>
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
