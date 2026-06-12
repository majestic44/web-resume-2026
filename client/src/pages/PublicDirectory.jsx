import { useEffect, useState } from 'react';
import { ProfileCard } from '../components/ProfileCard.jsx';

export function PublicDirectory() {
  const [profiles, setProfiles] = useState([]);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetch('/api/profiles')
      .then(response => response.json())
      .then(data => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]));
  }, []);

  return (
    <div className="site-shell directory-shell">
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
        <section className="directory-section-head">
          <div>
            <p className="eyebrow">Available Profiles</p>
            <h2>Choose a public page</h2>
          </div>
          <p>{profiles.length} public profile{profiles.length === 1 ? '' : 's'} ready to share.</p>
        </section>

        <section className="profile-grid profile-grid--directory" aria-label="Available profiles">
          {profiles.map(profile => <ProfileCard key={profile.slug} profile={profile} />)}
          {profiles.length === 0 ? (
            <div className="directory-empty-state">
              <h3>No profiles available yet</h3>
              <p>Add or activate a profile from the dashboard to populate the public directory.</p>
            </div>
          ) : null}
        </section>

        <footer className="directory-footer">
          <p>&copy; {currentYear} Household Resume CMS. All rights reserved.</p>
          <p>Application designed and developed by Jareth Thomas.</p>
        </footer>
      </main>
    </div>
  );
}

