import { Alert, Button, Card, Input, Label, Spinner, Switch, TextField } from '@heroui/react';
import { Save, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';

const roleOptions = [
  { key: 'owner', label: 'Owner' },
  { key: 'admin', label: 'Admin' },
  { key: 'editor', label: 'Editor' },
  { key: 'viewer', label: 'Viewer' }
];

export function Members({ authState }) {
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [createState, setCreateState] = useState('idle');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  const [memberStates, setMemberStates] = useState({});

  const canManage = authState.dataSource === 'database' && ['owner', 'admin'].includes(authState.user?.role);

  useEffect(() => {
    if (!canManage) {
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError('');

    fetch('/api/admin/members')
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load member assignments.');
        }

        return response.json();
      })
      .then(payload => {
        const nextMembers = payload.members || [];
        setMembers(nextMembers);
        setProfiles(payload.profiles || []);
        setMemberStates(buildMemberStates(nextMembers));
        setStatus('ready');
      })
      .catch(loadError => {
        setError(loadError.message);
        setStatus('error');
      });
  }, [canManage]);

  const memberCountLabel = useMemo(() => `${members.length} member${members.length === 1 ? '' : 's'}`, [members.length]);

  const handleCreate = () => {
    setCreateState('saving');
    setError('');

    fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm)
    })
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to create member.');
        }

        return response.json();
      })
      .then(payload => {
        const nextMembers = [...members, payload.member].sort(compareMembers);
        setMembers(nextMembers);
        setMemberStates(buildMemberStates(nextMembers));
        setCreateForm({ name: '', email: '', password: '', role: 'viewer' });
        setCreateState('saved');
      })
      .catch(createError => {
        setError(createError.message);
        setCreateState('error');
      });
  };

  const updateMemberState = (memberId, patch) => {
    setMemberStates(current => ({
      ...current,
      [memberId]: {
        ...(current[memberId] || {}),
        ...patch
      }
    }));
  };

  const toggleProfile = (memberId, profileSlug, selected) => {
    setMemberStates(current => {
      const previous = current[memberId] || { role: 'viewer', editableProfiles: [] };
      const editableProfiles = selected
        ? [...new Set([...previous.editableProfiles, profileSlug])]
        : previous.editableProfiles.filter(slug => slug !== profileSlug);
      const nextRole = selected && previous.role === 'viewer' ? 'editor' : previous.role;

      return {
        ...current,
        [memberId]: {
          ...previous,
          role: nextRole,
          editableProfiles,
          saved: false,
          autoRoleMessage: selected && previous.role === 'viewer'
            ? 'Viewer promoted to editor so profile access can be assigned.'
            : ''
        }
      };
    });
  };

  const saveMember = member => {
    const memberState = memberStates[member.id];
    if (!memberState) return;

    updateMemberState(member.id, { saving: true, error: '', saved: false });

    fetch(`/api/admin/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: memberState.role,
        editableProfiles: memberState.editableProfiles
      })
    })
      .then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to update member.');
        }

        return response.json();
      })
      .then(payload => {
        const nextMembers = members.map(entry => (entry.id === member.id ? payload.member : entry)).sort(compareMembers);
        const nextStates = buildMemberStates(nextMembers);
        nextStates[member.id] = {
          ...nextStates[member.id],
          saved: true
        };
        setMembers(nextMembers);
        setMemberStates(nextStates);
      })
      .catch(saveError => {
        updateMemberState(member.id, { saving: false, error: saveError.message, saved: false });
      });
  };

  return (
    <>
      <PageHeader eyebrow="Member Access" title="Household members">
        <p>
          {canManage
            ? 'Create family member accounts and choose which profiles each person can edit.'
            : authState.dataSource !== 'database'
              ? 'Switch to database mode to manage household accounts.'
              : 'Only owner or admin accounts can manage member access.'}
        </p>
      </PageHeader>

      {error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Access management error</Alert.Title>
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
                  <p className="card-label">Add Member</p>
                  <h2>Create household account</h2>
                  <p className="field-help">This creates a sign-in for a family member. You can assign profile access right away or later.</p>
                </div>
                <div className="form-grid two">
                  <TextField>
                    <Label>Name</Label>
                    <Input value={createForm.name} onChange={event => setCreateForm(current => ({ ...current, name: event.target.value }))} />
                  </TextField>
                  <TextField>
                    <Label>Email</Label>
                    <Input type="email" value={createForm.email} onChange={event => setCreateForm(current => ({ ...current, email: event.target.value }))} />
                  </TextField>
                  <TextField>
                    <Label>Password</Label>
                    <Input type="password" value={createForm.password} onChange={event => setCreateForm(current => ({ ...current, password: event.target.value }))} />
                  </TextField>
                  <label className="select-field">
                    <span>Global Role</span>
                    <select value={createForm.role} onChange={event => setCreateForm(current => ({ ...current, role: event.target.value }))}>
                      {roleOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="toolbar">
                  <Button type="button" onPress={handleCreate} isDisabled={createState === 'saving'}>
                    <UserPlus size={16} />
                    <span>{createState === 'saving' ? 'Creating...' : 'Create Member'}</span>
                  </Button>
                </div>
              </Card.Content>
            </Card>

            <Card className="members-summary-card">
              <Card.Content className="form-stack">
                <div>
                  <p className="card-label">Household Access</p>
                  <h2>{memberCountLabel}</h2>
                  <p className="field-help">Owners and admins can edit every profile. Editors need explicit profile assignment.</p>
                </div>
                <dl className="snapshot-list compact">
                  <div>
                    <dt>Profiles</dt>
                    <dd>{profiles.length}</dd>
                  </div>
                  <div>
                    <dt>Elevated Accounts</dt>
                    <dd>{members.filter(member => ['owner', 'admin'].includes(member.role)).length}</dd>
                  </div>
                  <div>
                    <dt>Editors</dt>
                    <dd>{members.filter(member => member.role === 'editor').length}</dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
          </section>

          <section className="members-grid" aria-label="Members">
            {status === 'loading' ? (
              <div className="loading-row">
                <Spinner size="sm" />
                <p>Loading members...</p>
              </div>
            ) : null}

            {members.map(member => {
              const memberState = memberStates[member.id] || {
                role: member.role,
                editableProfiles: member.editableProfiles.includes('*') ? [] : member.editableProfiles,
                saving: false,
                error: ''
              };
              const isSelf = authState.user?.id === member.id;
              const isElevated = ['owner', 'admin'].includes(memberState.role);

              return (
                <Card className="profile-card member-card" key={member.id}>
                  <Card.Content className="profile-card-content form-stack">
                    <div>
                      <p className="card-label">{member.role}</p>
                      <h2>{member.name}</h2>
                      <p>{member.email}</p>
                    </div>

                    <label className="select-field">
                      <span>Global Role</span>
                      <select
                        disabled={isSelf}
                        value={memberState.role}
                        onChange={event => updateMemberState(member.id, {
                          role: event.target.value,
                          editableProfiles: event.target.value === 'viewer' ? [] : memberState.editableProfiles,
                          saved: false
                        })}
                      >
                        {roleOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                      </select>
                    </label>

                    <div className="assignment-block">
                      <div className="assignment-header">
                        <strong>Editable Profiles</strong>
                        <span>
                          {isElevated
                            ? 'All profiles'
                            : memberState.role === 'viewer'
                              ? 'View-only account'
                              : `${memberState.editableProfiles.length} assigned`}
                        </span>
                      </div>
                      <p className="field-help">
                        {isElevated
                          ? 'Owner and admin accounts automatically have access to every family profile.'
                          : memberState.role === 'viewer'
                            ? 'Viewer accounts cannot edit profiles. Turning on access promotes the member to editor automatically.'
                            : 'Editor accounts can only work on the profiles switched on below.'}
                      </p>
                      <div className="assignment-list">
                        {profiles.map(profile => (
                          <div className="assignment-item assignment-item--switch" key={`${member.id}-${profile.slug}`}>
                            <span className="assignment-item__copy">
                              <strong>{profile.name}</strong>
                              <small>{profile.slug}</small>
                            </span>
                            <Switch
                              aria-label={`Allow ${member.name} to edit ${profile.name}`}
                              isSelected={isElevated || memberState.editableProfiles.includes(profile.slug)}
                              isDisabled={isElevated || isSelf}
                              onChange={selected => toggleProfile(member.id, profile.slug, selected)}
                            >
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isSelf ? <p className="field-help">Use another admin account to change your own access.</p> : null}
                    {memberState.autoRoleMessage ? <p className="assignment-note">{memberState.autoRoleMessage}</p> : null}
                    {memberState.saved ? <p className="editor-success">Member access saved.</p> : null}
                    {memberState.error ? <p className="editor-error">{memberState.error}</p> : null}

                    <div className="toolbar">
                      <Button type="button" onPress={() => saveMember(member)} isDisabled={memberState.saving || isSelf}>
                        <Save size={16} />
                        <span>{memberState.saving ? 'Saving...' : 'Save Access'}</span>
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

function compareMembers(left, right) {
  const rank = role => ['owner', 'admin', 'editor', 'viewer'].indexOf(role);
  return rank(left.role) - rank(right.role) || left.name.localeCompare(right.name);
}

function buildMemberStates(members) {
  return members.reduce((map, member) => {
    map[member.id] = {
      role: member.role,
      editableProfiles: member.editableProfiles.includes('*') ? [] : member.editableProfiles,
      saving: false,
      error: '',
      saved: false,
      autoRoleMessage: ''
    };
    return map;
  }, {});
}
