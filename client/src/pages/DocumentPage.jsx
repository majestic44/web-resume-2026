import { useEffect, useMemo, useState } from 'react';
import { normalizeCoverLetterData, normalizeResumeData } from '../lib/resume.js';
import { getTemplateDefinition } from '../templates/registry.js';

export function DocumentPage({ pathname, shared = false, sharedProfile = false }) {
  const [state, setState] = useState({ status: 'loading', document: null });
  const { type, slug, token, qrShare } = useMemo(() => {
    if (shared) {
      const segments = pathname.split('/').filter(Boolean);
      const qrShare = segments[2] === 'qr';
      return { type: 'resume', slug: '', token: qrShare ? segments[3] : segments[2], qrShare };
    }

    const [, route, profileSlug] = pathname.split('/');
    return { type: route === 'cover-letter' ? 'cover-letter' : 'resume', slug: profileSlug, token: '', qrShare: false };
  }, [pathname, shared]);

  useEffect(() => {
    const endpoint = shared
      ? (sharedProfile ? `/api/shared/profile/${qrShare ? 'qr/' : ''}${token}/resume` : `/api/shared/resume/${qrShare ? 'qr/' : ''}${token}`)
      : `/api/internal/documents/${type}/${slug}`;

    fetch(endpoint)
      .then(response => {
        if (!response.ok) throw new Error('Document not found');
        return response.json();
      })
      .then(document => setState({ status: 'ready', document }))
      .catch(error => setState({ status: 'error', error }));
  }, [shared, sharedProfile, token, type, slug, qrShare]);

  if (state.status === 'loading') {
    return <DocumentFrame title="Loading" shared={shared}><p className="muted">Loading document...</p></DocumentFrame>;
  }

  if (state.status === 'error') {
    return <DocumentFrame title="Not Found" shared={shared}><p>That document could not be loaded.</p></DocumentFrame>;
  }

  const meta = state.document.meta;
  const title = meta.name || state.document.content?.name || 'Shared Resume';

  return (
    <DocumentFrame title={title} subtitle={shared ? 'Shared Resume' : (type === 'resume' ? 'Professional Resume' : 'Cover Letter')} template={meta.template} shared={shared}>
      {type === 'resume' ? (
        <ResumeView data={state.document.content} template={meta.template} qrCodeUrl={qrShare ? (sharedProfile ? window.location.href.replace(/\/resume$/, '') : window.location.href) : ''} />
      ) : (
        <CoverLetterView data={state.document.content} template={meta.template} />
      )}
    </DocumentFrame>
  );
}

function DocumentFrame({ title, subtitle = 'Document', template = 'modern', shared = false, children }) {
  return (
    <div className={`site-shell template-shell template-${template}`.trim()}>
      <header className="site-topbar no-print">
        <div className="site-brand">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <nav>
          {!shared ? <a href="/dashboard">Dashboard</a> : null}
          <button type="button" onClick={() => window.print()}>Export PDF</button>
        </nav>
      </header>
      <main className="resume-page">{children}</main>
    </div>
  );
}

function ResumeView({ data, template, qrCodeUrl = '' }) {
  const resume = normalizeResumeData({ ...data, template });
  const { ResumeComponent } = getTemplateDefinition(resume.template);
  return <ResumeComponent resume={resume} qrCodeUrl={qrCodeUrl} />;
}

function CoverLetterView({ data, template }) {
  const letter = normalizeCoverLetterData({ ...data, template });
  const { CoverLetterComponent } = getTemplateDefinition(letter.template || template);
  return <CoverLetterComponent letter={letter} />;
}
