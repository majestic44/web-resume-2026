import { useEffect, useState } from 'react';
import { ProfileCard } from '../components/ProfileCard.jsx';

export function PublicDirectory() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    fetch('/api/profiles')
      .then(response => response.json())
      .then(data => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]));
  }, []);

  return (
    <div className="site-shell">
      <header className="site-topbar">
        <a className="site-brand" href="/">
          <strong>Resume Profiles</strong>
          <span>Household directory</span>
        </a>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/login">Sign In</a>
        </nav>
      </header>

      <main className="directory-page">
        <section className="public-hero">
          <p className="eyebrow">Resume Profiles</p>
          <h1>Choose a profile</h1>
          <p>Clean public resume and cover letter pages, powered by the new app foundation.</p>
        </section>

        <section className="profile-grid" aria-label="Available profiles">
          {profiles.map(profile => <ProfileCard key={profile.slug} profile={profile} />)}
        </section>
      </main>
    </div>
  );
}

