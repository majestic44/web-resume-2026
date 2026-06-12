import { Alert, Link, Spinner } from '@heroui/react';
import { BriefcaseBusiness, Eye, FilePenLine, FolderPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { ProfileCard } from '../components/ProfileCard.jsx';

export function Dashboard({ authState }) {
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/api/profiles')
      .then(response => response.json())
      .then(data => {
        setProfiles(data.profiles || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Admin Dashboard" title="Household resume manager">
        <p>
          {authState.dataSource === 'database'
            ? authState.user
              ? authState.user.editableProfiles?.includes('*')
                ? `Signed in as ${authState.user.name}. You can edit all family profiles.`
                : `Signed in as ${authState.user.name}. You can edit: ${authState.user.editableProfiles?.join(', ') || 'no assigned profiles yet'}.`
              : 'Database mode is active. Sign in before using protected draft actions.'
            : 'Profiles are still sourced from starter JSON files. Seed mode keeps local editing fast while the secure path is being finished.'}
        </p>
      </PageHeader>

      <section className="toolbar">
        <Link className="hero-link-button primary" href="/editor">
          <FilePenLine size={16} />
          <span>Open Editor</span>
        </Link>
        {authState.dataSource === 'database' && authState.user ? (
          <Link className="hero-link-button" href="/portfolio">
            <BriefcaseBusiness size={16} />
            <span>Manage Portfolio</span>
          </Link>
        ) : null}
        {authState.dataSource === 'database' && ['owner', 'admin'].includes(authState.user?.role) ? (
          <Link className="hero-link-button" href="/profiles">
            <FolderPlus size={16} />
            <span>Manage Profiles</span>
          </Link>
        ) : null}
        {authState.dataSource === 'database' && ['owner', 'admin'].includes(authState.user?.role) ? (
          <Link className="hero-link-button" href="/members">
            <Users size={16} />
            <span>Manage Members</span>
          </Link>
        ) : null}
        <Link className="hero-link-button" href="/">
          <Eye size={16} />
          <span>Public Directory</span>
        </Link>
      </section>

      {status === 'error' ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Profiles unavailable</Alert.Title>
            <Alert.Description>The API did not respond. Check that the Express server is running.</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <section className="profile-grid" aria-label="Profiles">
          {profiles.map(profile => <ProfileCard key={profile.slug} profile={profile} />)}
          {status === 'loading' ? (
            <div className="loading-row">
              <Spinner size="sm" />
              <p>Loading profiles...</p>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}
