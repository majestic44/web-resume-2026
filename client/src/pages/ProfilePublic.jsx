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
  if (asset?.assetType === 'image') return 'View Gallery Image';
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

function tagItems(skills) {
  return Array.isArray(skills) ? skills.filter(Boolean) : [];
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function assetDetailLabel(href) {
  if (!href) return '';

  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin ? url.pathname : url.hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

function assetKindLabel(asset, href) {
  if (asset?.assetType === 'pdf') return 'PDF';
  if (asset?.assetType === 'image') return 'Gallery';

  try {
    const url = new URL(href, window.location.origin);
    const host = url.hostname.replace(/^www\./, '');
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    return url.origin === window.location.origin ? 'Internal Link' : 'External Link';
  } catch {
    return 'Project Link';
  }
}

export function ProfilePublic({ pathname }) {
  const slug = useMemo(() => pathname.split('/')[2] || '', [pathname]);
  const [state, setState] = useState({ status: 'loading', payload: null });
  const [selectedType, setSelectedType] = useState('');
  const [selectedProgress, setSelectedProgress] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const profile = state.payload?.profile || null;
  const portfolioItems = state.payload?.portfolioItems || [];
  const initials = getInitials(profile?.name);
  const sectionVisibility = profile?.sectionVisibility || {
    documents: true,
    portfolio: true,
    certifications: false,
    references: false
  };

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

  useEffect(() => {
    setSelectedType('');
    setSelectedProgress('');
    setSelectedTag('');
    setLightboxImage(null);
  }, [slug]);

  useEffect(() => {
    if (!lightboxImage) return undefined;

    const handleKeydown = event => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [lightboxImage]);

  const typeOptions = useMemo(
    () => uniqueValues(portfolioItems.map(item => item.projectType || item.category || '')),
    [portfolioItems]
  );
  const progressOptions = useMemo(
    () => uniqueValues(portfolioItems.map(item => item.projectProgress || '')),
    [portfolioItems]
  );
  const tagOptions = useMemo(
    () => uniqueValues(portfolioItems.flatMap(item => tagItems(item.skills))),
    [portfolioItems]
  );
  const filteredItems = useMemo(
    () =>
      portfolioItems.filter(item => {
        const itemType = item.projectType || item.category || '';
        const itemTags = tagItems(item.skills);

        if (selectedType && itemType !== selectedType) return false;
        if (selectedProgress && item.projectProgress !== selectedProgress) return false;
        if (selectedTag && !itemTags.includes(selectedTag)) return false;

        return true;
      }),
    [portfolioItems, selectedProgress, selectedTag, selectedType]
  );
  const filtersActive = Boolean(selectedType || selectedProgress || selectedTag);
  const visibleSections = [
    sectionVisibility.documents ? 'Documents' : null,
    sectionVisibility.portfolio ? 'Portfolio' : null,
    sectionVisibility.certifications ? 'Certifications & Licenses' : null,
    sectionVisibility.references ? 'References' : null
  ].filter(Boolean);

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

  return (
    <div className="site-shell directory-shell">
      <header className="site-topbar no-print">
        <a className="site-brand" href="/">
          <strong>{profile.name}</strong>
          <span>Professional Profile</span>
        </a>
        <nav>
          <a href="/">Profiles</a>
          {sectionVisibility.documents ? <a href={profile.resumeLink}>Resume</a> : null}
          {sectionVisibility.documents ? <a href={profile.coverLetterLink}>Cover Letter</a> : null}
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
              {visibleSections.length ? (
                <div className="public-profile-hero__sections">
                  {visibleSections.map(label => <span key={label}>{label}</span>)}
                </div>
              ) : null}
            </div>
          </div>

          {sectionVisibility.documents ? (
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
          ) : null}
        </section>

        {sectionVisibility.documents ? (
          <section className="public-profile-section">
            <div className="directory-section-head">
              <div>
                <p className="eyebrow">Documents</p>
                <h2>Resume and cover letter</h2>
              </div>
              <p>Open the core job application documents for this profile.</p>
            </div>

            <section className="public-document-grid" aria-label="Public documents">
              <a className="public-document-card" href={profile.resumeLink}>
                <div className="public-document-card__icon">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="card-label">Resume</p>
                  <h3>Professional resume</h3>
                  <p>Open the current resume view for this profile.</p>
                </div>
              </a>
              <a className="public-document-card" href={profile.coverLetterLink}>
                <div className="public-document-card__icon">
                  <MailOpen size={18} />
                </div>
                <div>
                  <p className="card-label">Cover Letter</p>
                  <h3>General cover letter</h3>
                  <p>Open the public cover letter paired with this resume.</p>
                </div>
              </a>
            </section>
          </section>
        ) : null}

        {sectionVisibility.portfolio ? (
          <>
            <section className="directory-section-head">
              <div>
                <p className="eyebrow">Portfolio</p>
                <h2>Work samples and project highlights</h2>
              </div>
              <p>
                {filtersActive
                  ? `${filteredItems.length} of ${portfolioItems.length} portfolio item${portfolioItems.length === 1 ? '' : 's'} shown.`
                  : `${portfolioItems.length} portfolio item${portfolioItems.length === 1 ? '' : 's'} available.`}
              </p>
            </section>

            {portfolioItems.length ? (
              <>
                <section className="portfolio-filters no-print" aria-label="Portfolio filters">
                  <div className="portfolio-filters__row">
                    <label className="portfolio-filter-field">
                      <span>Project Type</span>
                      <select value={selectedType} onChange={event => setSelectedType(event.target.value)}>
                        <option value="">All types</option>
                        {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>

                    <label className="portfolio-filter-field">
                      <span>Progress</span>
                      <select value={selectedProgress} onChange={event => setSelectedProgress(event.target.value)}>
                        <option value="">All progress states</option>
                        {progressOptions.map(progress => (
                          <option key={progress} value={progress}>
                            {getProgressLabel(progress) || progress}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="portfolio-filters__reset"
                      onClick={() => {
                        setSelectedType('');
                        setSelectedProgress('');
                        setSelectedTag('');
                      }}
                      disabled={!filtersActive}
                    >
                      Clear Filters
                    </button>
                  </div>

                  {tagOptions.length ? (
                    <div className="portfolio-filters__tags">
                      <button
                        type="button"
                        className={`portfolio-filter-chip${selectedTag ? '' : ' is-active'}`}
                        onClick={() => setSelectedTag('')}
                      >
                        All tags
                      </button>
                      {tagOptions.map(tag => (
                        <button
                          type="button"
                          key={tag}
                          className={`portfolio-filter-chip${selectedTag === tag ? ' is-active' : ''}`}
                          onClick={() => setSelectedTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>

                {filteredItems.length ? (
                  <section className="portfolio-grid" aria-label="Portfolio items">
                    {filteredItems.map(item => {
                      const imageAssets = (item.assets || []).filter(asset => asset.assetType === 'image' && getAssetHref(asset));
                      const leadImage = imageAssets[0] || null;
                      const supportingAssets = (item.assets || []).filter(asset => asset !== leadImage && getAssetHref(asset));
                      const tags = tagItems(item.skills);

                      return (
                        <article className="portfolio-card" key={item.id || item.slug}>
                      {leadImage ? (
                            <button
                              type="button"
                              className="portfolio-card__cover-link"
                              onClick={() => setLightboxImage({
                                src: getAssetHref(leadImage),
                                alt: leadImage.label || item.title,
                                title: item.title,
                                detail: leadImage.label || 'Portfolio image'
                              })}
                            >
                              <img
                                className="portfolio-card__cover-image"
                                src={getAssetHref(leadImage)}
                                alt={leadImage.label || item.title}
                                loading="lazy"
                              />
                            </button>
                          ) : null}

                          <div className="portfolio-card__header">
                            <div className="portfolio-card__icon">
                              <BriefcaseBusiness size={18} />
                            </div>
                            <div>
                              <p className="card-label">{item.projectType || item.category || 'Portfolio Item'}</p>
                              <h3>{item.title}</h3>
                              <div className="portfolio-card__meta-row">
                                {item.projectProgress ? <span>{getProgressLabel(item.projectProgress)}</span> : null}
                                {item.featured ? <span>Featured</span> : null}
                              </div>
                            </div>
                          </div>

                          {item.summary ? <p className="portfolio-card__summary">{item.summary}</p> : null}
                          {item.description ? <p className="portfolio-card__description">{item.description}</p> : null}

                          {tags.length ? (
                            <div className="portfolio-card__tags">
                              {tags.map(tag => <span key={tag}>{tag}</span>)}
                            </div>
                          ) : null}

                          {supportingAssets.length ? (
                            <div className="portfolio-card__assets">
                              <p className="portfolio-card__assets-title">Project links</p>
                              {supportingAssets.map(asset => {
                                const href = getAssetHref(asset);
                                const kind = assetKindLabel(asset, href);
                                const detail = assetDetailLabel(href);
                                const Icon = asset.assetType === 'pdf' ? FileText : ExternalLink;

                                if (asset.assetType === 'image') {
                                  return (
                                    <button
                                      type="button"
                                      key={asset.id || `${item.id}-${asset.label}-${href}`}
                                      className="portfolio-card__asset-link"
                                      onClick={() => setLightboxImage({
                                        src: href,
                                        alt: asset.label || item.title,
                                        title: item.title,
                                        detail: asset.label || 'Gallery image'
                                      })}
                                    >
                                      <span className="portfolio-card__asset-main">
                                        <span className="portfolio-card__asset-kind">{kind}</span>
                                        <strong>{getAssetLabel(asset)}</strong>
                                        {detail ? <small>{detail}</small> : null}
                                      </span>
                                      <Icon size={15} />
                                    </button>
                                  );
                                }

                                return (
                                  <a
                                    key={asset.id || `${item.id}-${asset.label}-${href}`}
                                    className="portfolio-card__asset-link"
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <span className="portfolio-card__asset-main">
                                      <span className="portfolio-card__asset-kind">{kind}</span>
                                      <strong>{getAssetLabel(asset)}</strong>
                                      {detail ? <small>{detail}</small> : null}
                                    </span>
                                    <Icon size={15} />
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
                    <h3>No portfolio matches yet</h3>
                    <p>Try a different project type, progress state, or tag filter.</p>
                  </section>
                )}
              </>
            ) : (
              <section className="directory-empty-state">
                <h3>Portfolio coming soon</h3>
                <p>This profile does not have any public portfolio items yet.</p>
              </section>
            )}
          </>
        ) : null}

        {sectionVisibility.certifications ? (
          <section className="public-profile-section">
            <div className="directory-section-head">
              <div>
                <p className="eyebrow">Certifications</p>
                <h2>Certifications and licenses</h2>
              </div>
              <p>This section is enabled for future credentials and supporting documents.</p>
            </div>
            <section className="directory-empty-state">
              <h3>Certifications section is ready</h3>
              <p>Professional licenses, safety certifications, training records, and supporting files can be surfaced here when you decide to add that feature data.</p>
            </section>
          </section>
        ) : null}

        {sectionVisibility.references ? (
          <section className="public-profile-section">
            <div className="directory-section-head">
              <div>
                <p className="eyebrow">References</p>
                <h2>References</h2>
              </div>
              <p>This section can be used for public references or reference guidance later.</p>
            </div>
            <section className="directory-empty-state">
              <h3>References section is enabled</h3>
              <p>Reference contacts, recommendation details, or an “available upon request” block can be shown here once that content is added.</p>
            </section>
          </section>
        ) : null}
      </main>

      {lightboxImage ? (
        <div className="portfolio-lightbox no-print" role="dialog" aria-modal="true" aria-label="Portfolio image viewer">
          <button type="button" className="portfolio-lightbox__backdrop" onClick={() => setLightboxImage(null)} aria-label="Close image viewer" />
          <div className="portfolio-lightbox__dialog">
            <button type="button" className="portfolio-lightbox__close" onClick={() => setLightboxImage(null)}>
              Close
            </button>
            <img src={lightboxImage.src} alt={lightboxImage.alt} />
            <div className="portfolio-lightbox__caption">
              <strong>{lightboxImage.title}</strong>
              <span>{lightboxImage.detail}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
