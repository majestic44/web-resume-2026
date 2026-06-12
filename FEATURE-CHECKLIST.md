# Feature Checklist

Last updated: 2026-06-11

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

## In Progress / Partial

- [ ] Portfolio admin workflow
  Status: page exists and CRUD API exists, but it still needs real testing with live database content.

- [ ] Portfolio seed-mode editing
  Status: seed portfolio files exist, but `/portfolio` editing is currently database-only.

- [ ] Portfolio public content population
  Status: public profile pages are ready, but current portfolio seed files are empty.

- [ ] Document version history UI
  Status: backend versioning/draft history exists, but there is not yet a richer history-management screen.

- [ ] Public/shared visibility tooling
  Status: database schema includes visibility concepts, but broader share-link management is not surfaced in the UI yet.

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
- [ ] Confirm `/portfolio` renders correctly in seed mode
- [ ] Confirm portfolio CRUD works in database mode
- [ ] Confirm a public portfolio item appears on `/profile/:slug`
- [ ] Confirm no navigation regressions between directory, profile, resume, and cover letter pages
