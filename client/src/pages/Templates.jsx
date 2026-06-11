import { Card, Chip } from '@heroui/react';
import { PageHeader } from '../components/PageHeader.jsx';
import { templateOptions } from '../templates/registry.js';

export function Templates() {
  return (
    <>
      <PageHeader eyebrow="Templates" title="Resume templates">
        <p>Each template now lives in its own render file and stylesheet, so adding new ones later is just a registry entry instead of a cascade of conditional logic.</p>
      </PageHeader>

      <section className="template-grid">
        {templateOptions.map(template => (
          <Card className="template-card" key={template.id}>
            <Card.Content className="template-card-content">
              <div className={`template-preview ${template.id}-preview`} aria-hidden="true">
                {template.id === 'modern' ? (
                  <>
                    <div className="template-preview-hero">
                      <div className="template-preview-title-block">
                        <span className="template-preview-kicker">Modern</span>
                        <strong>Jareth Thomas</strong>
                        <small>Operations, Warehouse Logistics & Skilled Trades Professional</small>
                      </div>
                      <div className="template-preview-photo" />
                    </div>
                    <div className="template-preview-chip-row">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="template-preview-columns">
                      <div />
                      <div />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="template-preview-classic-header">
                      <span className="template-preview-kicker">Classic</span>
                      <strong>Angel Cunningham</strong>
                      <small>Construction, Logistics & Office Administration Professional</small>
                    </div>
                    <div className="template-preview-rule" />
                    <div className="template-preview-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </>
                )}
              </div>
              <div>
                <Chip color="primary" variant="soft">Template</Chip>
                <h2>{template.name}</h2>
                <p>{template.description}</p>
              </div>
            </Card.Content>
          </Card>
        ))}
      </section>
    </>
  );
}
