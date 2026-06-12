import { BriefcaseBusiness, ExternalLink, FileText, MailOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

function getAssetHref(asset) {
  return asset?.externalUrl || asset?.filePath || '';
}

function getAssetLabel(asset) {
  if (asset?.label) return asset.label;
  if (asset?.assetType === 'pdf') return 'View PDF';
  if (asset?.assetType === 'image') return 'View Photo';
  return 'Open Link';
}

function getProgressLabel(value) {
  return ({
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold'
  })[value] || '';
}

export function ProfilePublic({ pathname }) {
  const slug = useMemo(() => pathname.split('/')[2] || '', [pathname]);
  const [state, setState] = useState({ status: 'loading', payload: null });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'error', error: new Error('Profile not found') });
      return;
    }

    fetch(`/api/profiles/${slug}/public`)
      .then(response => {
        if (!response.ok) throw new Error('Profile not found');
        return response.json();
      })
      .then(payload => setState({ status: 'ready', payload }))
      .catch(error => setState({ status: 'error', error }));
  }, [slug]);

  if (state.status === 'loading') {
    return (
      <div className="site-shell directory-shell">
        <div className="resume-page">
          <p className="muted">Loading public profile...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error' || !state.payload) {
    return (
      <div className="site-shell directory-shell">
        <div className="resume-page">
          <h1>Profile not found</h1>
          <p className="muted">That public profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const { profile, portfolioItems } = state.payload;
  const initials = getInitials(profile.name);

  return (
    <div className="site-shell directory-shell">
      <header className="site-topbar no-print">
        <a className="site-brand" href="/">
          <strong>{profile.name}</strong>
          <span>Professional Profile</span>
        </a>
        <nav>
          <a href="/">Profiles</a>
          <a href={profile.resumeLink}>Resume</a>
          <a href={profile.coverLetterLink}>Cover Letter</a>
        </nav>
      </header>

      <main className="directory-page public-profile-page">
        <section className="public-profile-hero">
          <div className="public-profile-hero__identity">
            <div className="public-profile-hero__avatar" aria-hidden="true">
              {profile.image ? <img src={profile.image} alt={profile.name} /> : <span>{initials}</span>}
            </div>
            <div className="public-profile-hero__copy">
              <p className="eyebrow">Professional Profile</p>
              <h1>{profile.name}</h1>
              <p className="public-profile-hero__headline">{profile.headline}</p>
              {profile.summary ? <p className="public-profile-hero__summary">{profile.summary}</p> : null}
            </div>
          </div>

          <div className="public-profile-hero__actions">
            <a className="hero-link-button primary" href={profile.resumeLink}>
              <FileText size={16} />
              <span>View Resume</span>
            </a>
            <a className="hero-link-button" href={profile.coverLetterLink}>
              <MailOpen size={16} />
              <span>View Cover Letter</span>
            </a>
          </div>
        </section>

        <section className="directory-section-head">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>Work samples and project highlights</h2>
          </div>
          <p>{portfolioItems.length} portfolio item{portfolioItems.length === 1 ? '' : 's'} available.</p>
        </section>

        {portfolioItems.length ? (
          <section className="portfolio-grid" aria-label="Portfolio items">
            {portfolioItems.map(item => {
              const imageAssets = (item.assets || []).filter(asset => asset.assetType === 'image' && getAssetHref(asset));
              const leadImage = imageAssets[0] || null;
              const supportingAssets = (item.assets || []).filter(asset => asset.assetType !== 'image' && getAssetHref(asset));

              return (
                <article className="portfolio-card" key={item.id || item.slug}>
                  {leadImage ? (
                    <a
                      className="portfolio-card__cover-link"
                      href={getAssetHref(leadImage)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className="portfolio-card__cover-image"
                        src={getAssetHref(leadImage)}
                        alt={leadImage.label || item.title}
                        loading="lazy"
                      />
                    </a>
                  ) : null}

                  <div className="portfolio-card__header">
                    <div className="portfolio-card__icon">
                      <BriefcaseBusiness size={18} />
                    </div>
                    <div>
                      <p className="card-label">{item.projectType || item.category || 'Portfolio Item'}</p>
                      <h3>{item.title}</h3>
                      <div className="portfolio-card__meta-row">
                        {item.projectType ? <span>{item.projectType}</span> : null}
                        {item.projectProgress ? <span>{getProgressLabel(item.projectProgress)}</span> : null}
                      </div>
                    </div>
                  </div>

                  {item.summary ? <p className="portfolio-card__summary">{item.summary}</p> : null}
                  {item.description ? <p className="portfolio-card__description">{item.description}</p> : null}

                  {item.skills?.length ? (
                    <div className="portfolio-card__skills">
                      {item.skills.map(skill => <span key={skill}>{skill}</span>)}
                    </div>
                  ) : null}

                  {supportingAssets.length ? (
                    <div className="portfolio-card__assets">
                      {supportingAssets.map(asset => {
                        const href = getAssetHref(asset);
                        return (
                          <a
                            key={asset.id || `${item.id}-${asset.label}-${href}`}
                            className="portfolio-card__asset-link"
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>{getAssetLabel(asset)}</span>
                            <ExternalLink size={14} />
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="directory-empty-state">
            <h3>Portfolio coming soon</h3>
            <p>This profile does not have any public portfolio items yet.</p>
          </section>
        )}
      </main>
    </div>
  );
}
