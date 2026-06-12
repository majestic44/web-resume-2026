# Feature Checklist

Last updated: 2026-06-12

## Completed

- [x] Public profile directory at `/`
- [x] Public resume pages at `/resume/:slug`
- [x] Public cover letter pages at `/cover-letter/:slug`
- [x] Public full-profile hub at `/profile/:slug`
- [x] Resume draft editor with save, reset, history, and publish workflow
- [x] Cover-letter draft editor with save, reset, history, and publish workflow
- [x] Profile management page
- [x] Member access management page
- [x] Role-based authentication with sessions in database mode
- [x] Per-profile editor access control
- [x] Template registry with `modern` and `classic` templates
- [x] Public directory cards with shareable profile links
- [x] Profile image support on public directory/profile cards with initials fallback
- [x] Portfolio schema scaffold
- [x] Portfolio repository and API routes
- [x] Portfolio admin page at `/portfolio` in database mode
- [x] Portfolio management integrated into the editor workflow
- [x] Public portfolio project cards with lead images, links, project type, and progress
- [x] Portfolio tag support in editor/public card presentation

## In Progress / Partial

- [ ] Portfolio editor workflow QA
  Status: portfolio now lives in the editor and public cards are rendering, but it still needs end-to-end testing with real database content and the new project metadata migration.

- [ ] Portfolio seed-mode editing
  Status: public seed scaffolding exists, but portfolio editing is still database-only.

- [ ] Portfolio public content population
  Status: public profile pages are ready, but current seed portfolio files are empty and live database content needs broader filling-out.

- [ ] Document version history UI
  Status: backend versioning/draft history exists, but there is not yet a richer history-management screen.

- [ ] Public/shared visibility tooling
  Status: database schema includes visibility concepts, but broader share-link management is not surfaced in the UI yet.

- [ ] Portfolio uploads and reusable asset handling
  Status: project cards support image/file paths and URLs, but there is not yet a media library or direct upload flow.

## Next Planned Work

- [ ] Media library and upload workflow
  Goal: upload and reuse profile photos, portfolio images, PDFs, and attachments instead of relying only on paths/URLs.

- [ ] Portfolio editor polishing
  Goal: improve project-card editing layout, add better visual grouping, and reduce friction when managing several projects for one profile.

- [ ] Public portfolio interaction improvements
  Goal: support lightbox/gallery behavior, richer link presentation, and optional filtering by tag, type, or progress.

- [ ] Database migration + regression verification
  Goal: confirm migration `005_portfolio_project_meta.sql` is applied cleanly and verify editor/public profile behavior with real content.

## Planned Next Features

- [ ] Resume variants per profile
  Example: operations, logistics, skilled trades, IT support

- [ ] Cover-letter variants per profile
  Example: general, warehouse, manufacturing, admin

- [ ] Certifications and licenses
  Example fields: issuer, issued date, expiration date, credential ID, supporting link/file

- [ ] Media library / reusable uploads
  Goal: central place for profile photos, portfolio images, PDFs, and attachments

- [ ] Portfolio asset uploads
  Goal: upload files directly instead of only storing file paths or external URLs

- [ ] Public share-link management
  Goal: create trackable public/shareable links from the CMS

- [ ] Application tracking / private notes
  Goal: internal-only notes for jobs applied to, version used, and follow-up status

- [ ] Profile packet export
  Goal: export resume + cover letter + selected portfolio items together

- [ ] References section
  Goal: private by default, optional public visibility later

## Suggested Testing Focus

- [ ] Confirm `/profile/:slug` loads for existing profiles
- [ ] Confirm profile cards copy the full profile URL
- [ ] Confirm profile images display when present and fall back to initials when missing
- [ ] Confirm resume editor still saves/publishes correctly
- [ ] Confirm cover-letter editor still saves/publishes correctly
- [ ] Confirm the editor document selector now includes `Portfolio`
- [ ] Confirm portfolio CRUD works from `/editor` in database mode
- [ ] Confirm tags save and render correctly on public portfolio cards
- [ ] Confirm project type and progress save correctly after migration `005_portfolio_project_meta.sql`
- [ ] Confirm a public portfolio item appears on `/profile/:slug` with lead image, tags, links, and progress chips
- [ ] Confirm no navigation regressions between directory, profile, resume, and cover letter pages
