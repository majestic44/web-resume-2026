import { Alert, Button, Card, Input, Label, Spinner, TextField } from '@heroui/react';
import { Plus, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { templateOptions } from '../templates/registry.js';

function emptyCreateForm() {
  return {
    displayName: '',
    slug: '',
    headline: '',
    template: 'modern'
  };
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compareProfiles(left, right) {
  return left.displayName.localeCompare(right.displayName);
}

function buildProfileStates(profiles) {
  return profiles.reduce((map, profile) => {
    map[profile.id] = {
      displayName: profile.displayName,
      slug: profile.slug,
      headline: profile.headline || '',
      template: profile.template || 'modern',
      status: profile.status || 'active',
      saving: false,
      saved: false,
      error: ''
    };
    return map;
  }, {});
}

export function ProfilesAdmin({ authState }) {
  const [profiles, setProfiles] = useState([]);
  const [profileStates, setProfileStates] = useState({});
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [createState, setCreateState] = useState('idle');

  const canManage = authState.dataSource === 'database' && ['owner', 'admin'].includes(authState.user?.role);

  useEffect(() => {
    if (!canManage) {
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError('');

    fetch('/api/admin/profiles')
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load profiles.');
        }

        return response.json();
      })
      .then(payload => {
        const nextProfiles = (payload.profiles || []).sort(compareProfiles);
        setProfiles(nextProfiles);
        setProfileStates(buildProfileStates(nextProfiles));
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canManage]);

  const updateProfileState = (profileId, patch) => {
    setProfileStates(current => ({
      ...current,
      [profileId]: {
        ...(current[profileId] || {}),
        ...patch
      }
    }));
  };

  const handleCreate = async () => {
    setCreateState('saving');
    setError('');

    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create profile.');
      }

      const nextProfiles = [...profiles, payload.profile].sort(compareProfiles);
      setProfiles(nextProfiles);
      setProfileStates(buildProfileStates(nextProfiles));
      setCreateForm(emptyCreateForm());
      setCreateState('saved');
    } catch (createError) {
      setError(createError.message);
      setCreateState('error');
    }
  };

  const handleSave = async profile => {
    const profileState = profileStates[profile.id];
    if (!profileState) return;

    updateProfileState(profile.id, { saving: true, saved: false, error: '' });

    try {
      const response = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profileState.displayName,
          slug: profileState.slug,
          headline: profileState.headline,
          template: profileState.template,
          status: profileState.status
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save profile.');
      }

      const nextProfiles = profiles
        .map(entry => (entry.id === profile.id ? payload.profile : entry))
        .sort(compareProfiles);
      const nextStates = buildProfileStates(nextProfiles);
      nextStates[profile.id] = {
        ...nextStates[profile.id],
        saved: true
      };
      setProfiles(nextProfiles);
      setProfileStates(nextStates);
    } catch (saveError) {
      updateProfileState(profile.id, { saving: false, saved: false, error: saveError.message });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Profiles" title="Profile management">
        <p>
          {canManage
            ? 'Create new family profiles, choose their default template, and update the public profile details used across the CMS.'
            : authState.dataSource !== 'database'
              ? 'Switch to database mode to create and manage profiles.'
              : 'Only owner or admin accounts can manage profiles.'}
        </p>
      </PageHeader>

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Profile management error</Alert.Title>
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
                  <p className="card-label">Create Profile</p>
                  <h2>Add a new family resume</h2>
                  <p className="field-help">A new profile creates the public directory entry, a default resume, and a default cover letter together.</p>
                </div>
                <div className="form-grid two">
                  <TextField>
                    <Label>Display Name</Label>
                    <Input
                      value={createForm.displayName}
                      onChange={event => setCreateForm(current => ({
                        ...current,
                        displayName: event.target.value,
                        slug: current.slug ? current.slug : normalizeSlug(event.target.value)
                      }))}
                    />
                  </TextField>
                  <TextField>
                    <Label>Slug</Label>
                    <Input
                      value={createForm.slug}
                      onChange={event => setCreateForm(current => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                    />
                  </TextField>
                  <TextField>
                    <Label>Headline</Label>
                    <Input value={createForm.headline} onChange={event => setCreateForm(current => ({ ...current, headline: event.target.value }))} />
                  </TextField>
                  <label className="select-field">
                    <span>Template</span>
                    <select value={createForm.template} onChange={event => setCreateForm(current => ({ ...current, template: event.target.value }))}>
                      {templateOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="toolbar">
                  <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving'}>
                    <Plus size={16} />
                    <span>{createState === 'saving' ? 'Creating...' : 'Create Profile'}</span>
                  </Button>
                  {createState === 'saved' ? <p className="editor-success">Profile created. It is now available in the directory, editor, and member access views.</p> : null}
                </div>
              </Card.Content>
            </Card>

            <Card className="members-summary-card">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Profile Summary</p>
                  <h2>{profiles.length} profile{profiles.length === 1 ? '' : 's'}</h2>
                  <p className="field-help">Each active profile gets a public resume page, cover letter page, and editable draft workflow.</p>
                </div>
              </Card.Content>
            </Card>
          </section>

          <section className="profiles-admin-grid" aria-label="Managed profiles">
            {status === 'loading' ? (
              <div className="loading-row">
                <Spinner size="sm" />
                <p>Loading profiles...</p>
              </div>
            ) : null}

            {profiles.map(profile => {
              const profileState = profileStates[profile.id];
              if (!profileState) return null;

              return (
                <Card className="profile-card member-card" key={profile.id}>
                  <Card.Content className="profile-card-content form-stack">
                    <div>
                      <p className="card-label">{profile.slug}</p>
                      <h2>{profile.displayName}</h2>
                      <p>{profile.headline}</p>
                    </div>

                    <div className="form-grid two">
                      <TextField>
                        <Label>Display Name</Label>
                        <Input
                          value={profileState.displayName}
                          onChange={event => updateProfileState(profile.id, { displayName: event.target.value, saved: false })}
                        />
                      </TextField>
                      <TextField>
                        <Label>Slug</Label>
                        <Input
                          value={profileState.slug}
                          onChange={event => updateProfileState(profile.id, { slug: normalizeSlug(event.target.value), saved: false })}
                        />
                      </TextField>
                      <TextField>
                        <Label>Headline</Label>
                        <Input
                          value={profileState.headline}
                          onChange={event => updateProfileState(profile.id, { headline: event.target.value, saved: false })}
                        />
                      </TextField>
                      <label className="select-field">
                        <span>Template</span>
                        <select
                          value={profileState.template}
                          onChange={event => updateProfileState(profile.id, { template: event.target.value, saved: false })}
                        >
                          {templateOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </select>
                      </label>
                    </div>

                    {profileState.saved ? <p className="editor-success">Profile details saved.</p> : null}
                    {profileState.error ? <p className="editor-error">{profileState.error}</p> : null}

                    <div className="toolbar">
                      <Button type="button" onPress={() => handleSave(profile)} isDisabled={profileState.saving}>
                        <Save size={16} />
                        <span>{profileState.saving ? 'Saving...' : 'Save Profile'}</span>
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
