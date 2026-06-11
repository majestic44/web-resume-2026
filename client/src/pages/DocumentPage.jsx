import { useEffect, useMemo, useState } from 'react';
import { normalizeCoverLetterData, normalizeResumeData } from '../lib/resume.js';
import { getTemplateDefinition } from '../templates/registry.js';

export function DocumentPage({ pathname }) {
  const [state, setState] = useState({ status: 'loading', document: null });
  const { type, slug } = useMemo(() => {
    const [, route, profileSlug] = pathname.split('/');
    return { type: route === 'cover-letter' ? 'cover-letter' : 'resume', slug: profileSlug };
  }, [pathname]);

  useEffect(() => {
    fetch(`/api/documents/${type}/${slug}`)
      .then(response => {
        if (!response.ok) throw new Error('Document not found');
        return response.json();
      })
      .then(document => setState({ status: 'ready', document }))
      .catch(error => setState({ status: 'error', error }));
  }, [type, slug]);

  if (state.status === 'loading') {
    return <DocumentFrame title="Loading"><p className="muted">Loading document...</p></DocumentFrame>;
  }

  if (state.status === 'error') {
    return <DocumentFrame title="Not Found"><p>That document could not be loaded.</p></DocumentFrame>;
  }

  const meta = state.document.meta;

  return (
    <DocumentFrame title={meta.name} subtitle={type === 'resume' ? 'Professional Resume' : 'Cover Letter'} template={meta.template}>
      {type === 'resume' ? (
        <ResumeView data={state.document.content} template={meta.template} />
      ) : (
        <CoverLetterView data={state.document.content} template={meta.template} />
      )}
    </DocumentFrame>
  );
}

function DocumentFrame({ title, subtitle = 'Document', template = 'modern', children }) {
  return (
    <div className={`site-shell template-shell template-${template}`.trim()}>
      <header className="site-topbar no-print">
        <a className="site-brand" href="/">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </a>
        <nav>
          <a href="/">Profiles</a>
          <button type="button" onClick={() => window.print()}>Export PDF</button>
        </nav>
      </header>
      <main className="resume-page">{children}</main>
    </div>
  );
}

function ResumeView({ data, template }) {
  const resume = normalizeResumeData({ ...data, template });
  const { ResumeComponent } = getTemplateDefinition(resume.template);
  return <ResumeComponent resume={resume} />;
}

function CoverLetterView({ data, template }) {
  const letter = normalizeCoverLetterData({ ...data, template });
  const { CoverLetterComponent } = getTemplateDefinition(letter.template || template);
  return <CoverLetterComponent letter={letter} />;
}
